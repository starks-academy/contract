# Quick Testnet Deployment Guide

## Prerequisites Checklist

- [ ] Testnet wallet created at [wallet.hiro.so](https://wallet.hiro.so/)
- [ ] 24-word mnemonic saved securely
- [ ] Testnet STX received from [faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)
- [ ] Dependencies installed (`pnpm install`)

## Deployment Steps

### 1. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your mnemonic
nano .env  # or use your preferred editor
```

Add this line to `.env`:
```
DEPLOYER_MNEMONIC=your twenty four word mnemonic phrase here
```

### 2. Check Readiness
```bash
pnpm check-ready
```

This will verify:
- ✅ .env file exists with mnemonic
- ✅ Contract file is present
- ✅ Dependencies are installed

### 3. Deploy to Testnet
```bash
pnpm deploy:testnet
```

Expected output:
```
🚀 Deploying to Stacks Testnet
📍 Deployer address: ST...
📝 Contract name: stacks-academy-cert
📄 Contract size: 5269 bytes

⏳ Fetching account nonce...
✅ Nonce: 0

🔨 Building transaction...
✅ Transaction built
💰 Fee: 0.5 STX

📡 Broadcasting transaction...

✅ Contract deployed successfully!
📋 Transaction ID: 0x...
🔗 View on explorer: https://explorer.hiro.so/txid/0x...?chain=testnet

📜 Contract address: ST....stacks-academy-cert
🔗 View contract: https://explorer.hiro.so/address/ST...?chain=testnet
```

### 4. Verify Deployment

1. Click the transaction link to watch it confirm (~10 minutes)
2. Once confirmed, click the contract link to view it
3. Test calling read-only functions in the explorer

## Common Issues

**"DEPLOYER_MNEMONIC environment variable not set"**
- Make sure you created the `.env` file
- Check that the mnemonic is on a line starting with `DEPLOYER_MNEMONIC=`

**"Insufficient balance"**
- Request testnet STX from the faucet
- Wait for the faucet transaction to confirm

**"Contract already exists"**
- You've already deployed this contract from this address
- Use a different wallet or change the contract name

## Next Steps After Deployment

1. **Save the contract address** - You'll need it for your backend
2. **Test minting** - Try minting a certificate using the explorer
3. **Update your API** - Configure your backend with the contract address
4. **Update frontend** - Point your dApp to the testnet contract

## Testing the Deployed Contract

### Using Stacks Explorer

1. Go to your contract page
2. Click on "Functions" tab
3. Try calling `get-last-token-id` (should return 0)
4. Try calling `mint` with:
   - recipient: Your testnet address
   - module-id: 1
   - score: 85

### Using Stacks CLI

```bash
# Install Stacks CLI
npm install -g @stacks/cli

# Call read-only function
stacks call_read_only_contract_func \
  ST....stacks-academy-cert \
  get-last-token-id \
  --testnet

# Call public function (mint)
stacks call_contract_func \
  ST....stacks-academy-cert \
  mint \
  -a "ST..." \
  -m 1 \
  -s 85 \
  --testnet
```

## Cost Breakdown

- **Deployment fee**: ~0.5 STX
- **Mint transaction**: ~0.002 STX per mint
- **Transfer transaction**: ~0.002 STX per transfer

## Support

For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md)

For Stacks documentation: https://docs.stacks.co/
