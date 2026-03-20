import { existsSync, readFileSync } from "fs";
import { join } from "path";

console.log("🔍 Checking deployment readiness...\n");

let allGood = true;

// Check 1: .env file exists
console.log("1️⃣  Checking .env file...");
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    if (envContent.includes("DEPLOYER_MNEMONIC=") && !envContent.includes("your testnet mnemonic here")) {
        console.log("   ✅ .env file exists with mnemonic configured\n");
    } else {
        console.log("   ❌ .env file exists but DEPLOYER_MNEMONIC not configured");
        console.log("   → Edit .env and add your testnet mnemonic\n");
        allGood = false;
    }
} else {
    console.log("   ❌ .env file not found");
    console.log("   → Run: cp .env.example .env");
    console.log("   → Then edit .env and add your testnet mnemonic\n");
    allGood = false;
}

// Check 2: Contract file exists
console.log("2️⃣  Checking contract file...");
const contractPath = join(process.cwd(), "contracts", "stacks-academy-cert.clar");
if (existsSync(contractPath)) {
    const contractSize = readFileSync(contractPath, "utf-8").length;
    console.log(`   ✅ Contract file exists (${contractSize} bytes)\n`);
} else {
    console.log("   ❌ Contract file not found at contracts/stacks-academy-cert.clar\n");
    allGood = false;
}

// Check 3: Dependencies installed
console.log("3️⃣  Checking dependencies...");
const nodeModulesPath = join(process.cwd(), "node_modules");
if (existsSync(nodeModulesPath)) {
    console.log("   ✅ Dependencies installed\n");
} else {
    console.log("   ❌ Dependencies not installed");
    console.log("   → Run: pnpm install\n");
    allGood = false;
}

// Summary
console.log("━".repeat(50));
if (allGood) {
    console.log("\n✅ All checks passed! Ready to deploy.\n");
    console.log("Next steps:");
    console.log("1. Get testnet STX from: https://explorer.hiro.so/sandbox/faucet?chain=testnet");
    console.log("2. Wait for faucet transaction to confirm (~10 min)");
    console.log("3. Run: pnpm deploy:testnet\n");
} else {
    console.log("\n❌ Some checks failed. Please fix the issues above before deploying.\n");
    process.exit(1);
}
