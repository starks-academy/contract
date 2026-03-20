import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

// ---------------------------------------------------------------------------
// Test suite for stacks-academy-cert (SIP-009 NFT)
// Run with: npx clarinet test  OR  npx vitest run
// ---------------------------------------------------------------------------

const contractName = "stacks-academy-cert";
let simnet: Awaited<ReturnType<typeof initSimnet>>;

beforeEach(async () => {
  simnet = await initSimnet();
});

// Helpers
const deployer = () => simnet.getAccounts().get("deployer")!;
const wallet1 = () => simnet.getAccounts().get("wallet_1")!;
const wallet2 = () => simnet.getAccounts().get("wallet_2")!;

function mint(
  recipient: string,
  moduleId: number,
  score: number,
  caller: string,
) {
  return simnet.callPublicFn(
    contractName,
    "mint",
    [Cl.principal(recipient), Cl.uint(moduleId), Cl.uint(score)],
    caller,
  );
}

// ---------------------------------------------------------------------------
describe("get-last-token-id", () => {
  it("starts at 0", () => {
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(result.result).toBeOk(Cl.uint(0));
  });
});

// ---------------------------------------------------------------------------
describe("mint", () => {
  it("owner can mint a certificate for a learner", () => {
    const { result } = mint(wallet1(), 1, 85, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("increments token-id on each mint", () => {
    mint(wallet1(), 1, 80, deployer());
    const { result } = mint(wallet2(), 2, 90, deployer());
    expect(result).toBeOk(Cl.uint(2));
  });

  it("non-owner cannot mint (ERR-NOT-OWNER = u100)", () => {
    const { result } = mint(wallet2(), 1, 70, wallet1());
    expect(result).toBeErr(Cl.uint(100));
  });

  it("rejects module-id below 1 (ERR-INVALID-MODULE = u104)", () => {
    const { result } = mint(wallet1(), 0, 80, deployer());
    expect(result).toBeErr(Cl.uint(104));
  });

  it("rejects module-id above 6 (ERR-INVALID-MODULE = u104)", () => {
    const { result } = mint(wallet1(), 7, 80, deployer());
    expect(result).toBeErr(Cl.uint(104));
  });

  it("rejects score above 100 (ERR-INVALID-SCORE = u105)", () => {
    const { result } = mint(wallet1(), 1, 101, deployer());
    expect(result).toBeErr(Cl.uint(105));
  });

  it("prevents duplicate certificate for same (recipient, module) (ERR-ALREADY-CERTIFIED = u103)", () => {
    mint(wallet1(), 3, 75, deployer());
    const { result } = mint(wallet1(), 3, 90, deployer());
    expect(result).toBeErr(Cl.uint(103));
  });

  it("allows same recipient to get cert for different modules", () => {
    mint(wallet1(), 1, 80, deployer());
    const { result } = mint(wallet1(), 2, 90, deployer());
    expect(result).toBeOk(Cl.uint(2));
  });
});

// ---------------------------------------------------------------------------
describe("get-owner", () => {
  it("returns the recipient after mint", () => {
    mint(wallet1(), 1, 80, deployer());
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-owner",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeOk(Cl.some(Cl.principal(wallet1())));
  });
});

// ---------------------------------------------------------------------------
describe("get-token-uri", () => {
  it("returns the base URI", () => {
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-token-uri",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeOk(
      Cl.some(Cl.stringAscii("https://api.stacksacademy.xyz/nft/certificate/")),
    );
  });
});

// ---------------------------------------------------------------------------
describe("get-token-metadata", () => {
  it("returns correct metadata after mint", () => {
    mint(wallet1(), 4, 92, deployer());
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-token-metadata",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeOk(
      Cl.tuple({
        "token-id": Cl.uint(1),
        owner: Cl.principal(wallet1()),
        "module-id": Cl.uint(4),
        score: Cl.uint(92),
      }),
    );
  });

  it("returns ERR-TOKEN-NOT-FOUND (u102) for unminted token", () => {
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-token-metadata",
      [Cl.uint(99)],
      deployer(),
    );
    expect(result.result).toBeErr(Cl.uint(102));
  });
});

// ---------------------------------------------------------------------------
describe("get-cert-for-module", () => {
  it("returns none before any mint", () => {
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeNone();
  });

  it("returns (some token-id) after mint", () => {
    mint(wallet1(), 5, 77, deployer());
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(5)],
      deployer(),
    );
    expect(result.result).toBeSome(Cl.uint(1));
  });
});

// ---------------------------------------------------------------------------
describe("transfer", () => {
  it("token owner can transfer", () => {
    mint(wallet1(), 1, 80, deployer());
    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("non-owner cannot transfer (ERR-NOT-TOKEN-OWNER = u101)", () => {
    mint(wallet1(), 1, 80, deployer());
    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet2(), // wallet2 is not the owner
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("cannot transfer to self (ERR-TRANSFER-TO-SELF = u106)", () => {
    mint(wallet1(), 1, 80, deployer());
    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet1())],
      wallet1(),
    );
    expect(result).toBeErr(Cl.uint(106));
  });

  it("cannot transfer non-existent token (ERR-TOKEN-NOT-FOUND = u102)", () => {
    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(999), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("new owner can transfer after receiving", () => {
    mint(wallet1(), 1, 80, deployer());
    simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );

    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet2()), Cl.principal(wallet1())],
      wallet2(),
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("original owner cannot transfer after transferring away", () => {
    mint(wallet1(), 1, 80, deployer());
    simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );

    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet2()), Cl.principal(wallet1())],
      wallet1(), // wallet1 no longer owns it
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("get-owner reflects new owner after transfer", () => {
    mint(wallet1(), 1, 80, deployer());
    simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );

    const result = simnet.callReadOnlyFn(
      contractName,
      "get-owner",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeOk(Cl.some(Cl.principal(wallet2())));
  });
});

// ---------------------------------------------------------------------------
describe("mint - boundary conditions", () => {
  it("accepts minimum valid module-id (1)", () => {
    const { result } = mint(wallet1(), 1, 50, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("accepts maximum valid module-id (6)", () => {
    const { result } = mint(wallet1(), 6, 50, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("accepts minimum valid score (0)", () => {
    const { result } = mint(wallet1(), 1, 0, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("accepts maximum valid score (100)", () => {
    const { result } = mint(wallet1(), 1, 100, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("can mint all 6 modules to same recipient", () => {
    for (let i = 1; i <= 6; i++) {
      const { result } = mint(wallet1(), i, 80, deployer());
      expect(result).toBeOk(Cl.uint(i));
    }

    const lastTokenId = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(lastTokenId.result).toBeOk(Cl.uint(6));
  });

  it("can mint same module to different recipients", () => {
    const { result: r1 } = mint(wallet1(), 1, 80, deployer());
    expect(r1).toBeOk(Cl.uint(1));

    const { result: r2 } = mint(wallet2(), 1, 90, deployer());
    expect(r2).toBeOk(Cl.uint(2));
  });
});

// ---------------------------------------------------------------------------
describe("get-token-metadata - comprehensive", () => {
  it("returns correct metadata for multiple tokens", () => {
    mint(wallet1(), 1, 85, deployer());
    mint(wallet2(), 3, 92, deployer());
    mint(wallet1(), 5, 78, deployer());

    const result1 = simnet.callReadOnlyFn(
      contractName,
      "get-token-metadata",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result1.result).toBeOk(
      Cl.tuple({
        "token-id": Cl.uint(1),
        owner: Cl.principal(wallet1()),
        "module-id": Cl.uint(1),
        score: Cl.uint(85),
      }),
    );

    const result2 = simnet.callReadOnlyFn(
      contractName,
      "get-token-metadata",
      [Cl.uint(2)],
      deployer(),
    );
    expect(result2.result).toBeOk(
      Cl.tuple({
        "token-id": Cl.uint(2),
        owner: Cl.principal(wallet2()),
        "module-id": Cl.uint(3),
        score: Cl.uint(92),
      }),
    );
  });

  it("metadata persists after transfer", () => {
    mint(wallet1(), 2, 88, deployer());
    simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );

    const result = simnet.callReadOnlyFn(
      contractName,
      "get-token-metadata",
      [Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeOk(
      Cl.tuple({
        "token-id": Cl.uint(1),
        owner: Cl.principal(wallet2()), // new owner
        "module-id": Cl.uint(2),              // original module
        score: Cl.uint(88),             // original score
      }),
    );
  });
});

// ---------------------------------------------------------------------------
describe("get-cert-for-module - comprehensive", () => {
  it("returns correct token-id for each module", () => {
    mint(wallet1(), 1, 80, deployer());
    mint(wallet1(), 3, 85, deployer());
    mint(wallet1(), 6, 90, deployer());

    const result1 = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(1)],
      deployer(),
    );
    expect(result1.result).toBeSome(Cl.uint(1));

    const result3 = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(3)],
      deployer(),
    );
    expect(result3.result).toBeSome(Cl.uint(2));

    const result6 = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(6)],
      deployer(),
    );
    expect(result6.result).toBeSome(Cl.uint(3));
  });

  it("returns none for modules not yet earned", () => {
    mint(wallet1(), 1, 80, deployer());

    const result = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(2)],
      deployer(),
    );
    expect(result.result).toBeNone();
  });

  it("different recipients have independent cert tracking", () => {
    mint(wallet1(), 1, 80, deployer());
    mint(wallet2(), 1, 90, deployer());

    const result1 = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(1)],
      deployer(),
    );
    expect(result1.result).toBeSome(Cl.uint(1));

    const result2 = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet2()), Cl.uint(1)],
      deployer(),
    );
    expect(result2.result).toBeSome(Cl.uint(2));
  });

  it("cert tracking persists after transfer", () => {
    mint(wallet1(), 1, 80, deployer());
    simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet1()), Cl.principal(wallet2())],
      wallet1(),
    );

    // Original recipient still shows as having earned the cert
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-cert-for-module",
      [Cl.principal(wallet1()), Cl.uint(1)],
      deployer(),
    );
    expect(result.result).toBeSome(Cl.uint(1));
  });
});

// ---------------------------------------------------------------------------
describe("SIP-009 compliance", () => {
  it("get-last-token-id increments correctly", () => {
    let lastId = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(lastId.result).toBeOk(Cl.uint(0));

    mint(wallet1(), 1, 80, deployer());
    lastId = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(lastId.result).toBeOk(Cl.uint(1));

    mint(wallet2(), 2, 90, deployer());
    lastId = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(lastId.result).toBeOk(Cl.uint(2));
  });

  it("get-token-uri returns same URI for all tokens", () => {
    mint(wallet1(), 1, 80, deployer());
    mint(wallet2(), 2, 90, deployer());

    const uri1 = simnet.callReadOnlyFn(
      contractName,
      "get-token-uri",
      [Cl.uint(1)],
      deployer(),
    );
    const uri2 = simnet.callReadOnlyFn(
      contractName,
      "get-token-uri",
      [Cl.uint(2)],
      deployer(),
    );

    expect(uri1.result).toBeOk(
      Cl.some(Cl.stringAscii("https://api.stacksacademy.xyz/nft/certificate/")),
    );
    expect(uri2.result).toBeOk(
      Cl.some(Cl.stringAscii("https://api.stacksacademy.xyz/nft/certificate/")),
    );
  });

  it("get-owner returns none for non-existent token", () => {
    const result = simnet.callReadOnlyFn(
      contractName,
      "get-owner",
      [Cl.uint(999)],
      deployer(),
    );
    expect(result.result).toBeOk(Cl.none());
  });
});

// ---------------------------------------------------------------------------
describe("security and access control", () => {
  it("only deployer can mint certificates", () => {
    const { result } = mint(wallet2(), 1, 80, wallet1());
    expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-OWNER
  });

  it("deployer can mint to themselves", () => {
    const { result } = mint(deployer(), 1, 80, deployer());
    expect(result).toBeOk(Cl.uint(1));
  });

  it("prevents replay of same certificate", () => {
    mint(wallet1(), 2, 75, deployer());
    const { result } = mint(wallet1(), 2, 100, deployer());
    expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-CERTIFIED
  });

  it("transfer requires correct sender principal", () => {
    mint(wallet1(), 1, 80, deployer());

    // Attempt to transfer with wrong sender principal
    // wallet2 is trying to transfer, but wallet1 owns the token
    // nft-transfer? will fail with (err u1) because sender doesn't own the token
    const { result } = simnet.callPublicFn(
      contractName,
      "transfer",
      [Cl.uint(1), Cl.principal(wallet2()), Cl.principal(wallet1())],
      wallet2(),
    );
    expect(result).toBeErr(Cl.uint(1)); // Built-in NFT transfer error
  });
});

// ---------------------------------------------------------------------------
describe("edge cases and stress tests", () => {
  it("handles sequential mints correctly", () => {
    const recipients = [wallet1(), wallet2(), wallet1(), wallet2()];
    const modules = [1, 1, 2, 3];
    const scores = [80, 85, 90, 95];

    for (let i = 0; i < recipients.length; i++) {
      const { result } = mint(recipients[i], modules[i], scores[i], deployer());
      expect(result).toBeOk(Cl.uint(i + 1));
    }

    const lastId = simnet.callReadOnlyFn(
      contractName,
      "get-last-token-id",
      [],
      deployer(),
    );
    expect(lastId.result).toBeOk(Cl.uint(4));
  });

  it("handles all valid module IDs", () => {
    for (let moduleId = 1; moduleId <= 6; moduleId++) {
      const { result } = mint(wallet1(), moduleId, 80, deployer());
      expect(result).toBeOk(Cl.uint(moduleId));
    }
  });

  it("handles all score ranges", () => {
    const scores = [0, 25, 50, 75, 100];
    for (let i = 0; i < scores.length; i++) {
      const { result } = mint(wallet1(), i + 1, scores[i], deployer());
      expect(result).toBeOk(Cl.uint(i + 1));
    }
  });

  it("token metadata remains consistent across operations", () => {
    mint(wallet1(), 3, 87, deployer());

    // Check metadata multiple times
    for (let i = 0; i < 3; i++) {
      const result = simnet.callReadOnlyFn(
        contractName,
        "get-token-metadata",
        [Cl.uint(1)],
        deployer(),
      );
      expect(result.result).toBeOk(
        Cl.tuple({
          "token-id": Cl.uint(1),
          owner: Cl.principal(wallet1()),
          "module-id": Cl.uint(3),
          score: Cl.uint(87),
        }),
      );
    }
  });
});
