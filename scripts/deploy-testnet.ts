import { STACKS_TESTNET } from "@stacks/network";
import {
    makeContractDeploy,
    broadcastTransaction,
    AnchorMode,
} from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import { readFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";

// Load environment variables
config();

// Configuration
const NETWORK = STACKS_TESTNET;
const CONTRACT_NAME = "stacks-academy-cert";
const API_URL = "https://api.testnet.hiro.so";

// Helper to get nonce from API
async function getNonce(address: string): Promise<bigint> {
    const url = `${API_URL}/v2/accounts/${address}?proof=0`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch nonce: ${response.statusText}`);
    }
    const data = await response.json();
    return BigInt(data.nonce);
}

async function deployContract() {
    // Read the mnemonic from environment variable
    const mnemonic = process.env.DEPLOYER_MNEMONIC;

    if (!mnemonic) {
        console.error("❌ Error: DEPLOYER_MNEMONIC environment variable not set");
        console.log("\nPlease set your testnet mnemonic:");
        console.log('export DEPLOYER_MNEMONIC="your mnemonic here"');
        console.log("\nOr create a .env file in the contract directory with:");
        console.log("DEPLOYER_MNEMONIC=your mnemonic here");
        process.exit(1);
    }

    // Generate wallet from mnemonic
    const wallet = await generateWallet({
        secretKey: mnemonic,
        password: "",
    });

    const account = wallet.accounts[0];
    const senderAddress = getStxAddress({ account, network: "testnet" });
    const senderKey = account.stxPrivateKey;

    console.log("🚀 Deploying to Stacks Testnet");
    console.log("📍 Deployer address:", senderAddress);
    console.log("📝 Contract name:", CONTRACT_NAME);

    // Read contract source
    const contractPath = join(
        process.cwd(),
        "contracts",
        `${CONTRACT_NAME}.clar`
    );
    const codeBody = readFileSync(contractPath, "utf-8");

    console.log("\n📄 Contract size:", codeBody.length, "bytes");

    // Get nonce
    console.log("\n⏳ Fetching account nonce...");
    const nonce = await getNonce(senderAddress);
    console.log("✅ Nonce:", nonce.toString());

    // Create transaction
    console.log("\n🔨 Building transaction...");
    const txOptions = {
        contractName: CONTRACT_NAME,
        codeBody,
        senderKey,
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        nonce,
        fee: 500000n, // 0.5 STX fee
    };

    const transaction = await makeContractDeploy(txOptions);

    console.log("✅ Transaction built");
    console.log("💰 Fee:", Number(transaction.auth.spendingCondition.fee) / 1_000_000, "STX");

    // Broadcast transaction
    console.log("\n📡 Broadcasting transaction...");
    try {
        const broadcastResponse = await broadcastTransaction({
            transaction,
            network: NETWORK,
        });

        // Handle both string txid and object response
        let txid: string;
        if (typeof broadcastResponse === "string") {
            txid = broadcastResponse;
        } else if (typeof broadcastResponse === "object" && "txid" in broadcastResponse) {
            txid = (broadcastResponse as any).txid;
        } else {
            console.error("\n❌ Unexpected response format:");
            console.error(JSON.stringify(broadcastResponse, null, 2));
            process.exit(1);
        }

        // Success - txid received
        console.log("\n✅ Contract deployed successfully!");
        console.log("📋 Transaction ID:", txid);
        console.log(
            "🔗 View on explorer:",
            `https://explorer.hiro.so/txid/${txid}?chain=testnet`
        );
        console.log(
            "\n📜 Contract address:",
            `${senderAddress}.${CONTRACT_NAME}`
        );
        console.log(
            "🔗 View contract:",
            `https://explorer.hiro.so/address/${senderAddress}?chain=testnet`
        );

        console.log("\n⏳ Transaction is being processed...");
        console.log("   It will take ~10 minutes to confirm on testnet.");
    } catch (error) {
        console.error("\n❌ Error broadcasting transaction:");
        console.error(error);
        process.exit(1);
    }
}

// Run deployment
deployContract().catch((error) => {
    console.error("\n❌ Deployment error:");
    console.error(error);
    process.exit(1);
});
