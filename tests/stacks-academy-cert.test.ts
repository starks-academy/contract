import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";
import { initSimnet } from "@hirosystems/clarinet-sdk";

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
const wallet1  = () => simnet.getAccounts().get("wallet_1")!;
const wallet2  = () => simnet.getAccounts().get("wallet_2")!;

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
        "token-id":  Cl.uint(1),
        owner:       Cl.principal(wallet1()),
        "module-id": Cl.uint(4),
        score:       Cl.uint(92),
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
});
