# Stacks Academy Certificate Contract

SIP-009 compliant NFT contract for issuing course completion certificates.

## Quick Start

### Testing
```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Run tests with coverage
pnpm test:report

# Watch mode for development
pnpm test:watch
```

### Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick deploy to testnet:**
```bash
# 1. Get testnet STX from faucet
# 2. Create .env file with your mnemonic
cp .env.example .env

# 3. Edit .env and add your DEPLOYER_MNEMONIC

# 4. Deploy
pnpm deploy:testnet
```

## Contract Overview

The `stacks-academy-cert` contract issues NFT certificates when learners complete course modules.

### Features
- ✅ SIP-009 compliant NFT
- ✅ One certificate per (learner, module) pair
- ✅ On-chain metadata (module ID, score)
- ✅ Transferable certificates
- ✅ Deployer-only minting
- ✅ 6 course modules supported

### Contract Functions

**Minting** (deployer only):
```clarity
(mint (recipient principal) (module-id uint) (score uint))
```

**Transfer**:
```clarity
(transfer (token-id uint) (sender principal) (recipient principal))
```

**Read-Only**:
- `get-last-token-id()` - Latest token ID
- `get-owner(token-id)` - Token owner
- `get-token-uri(token-id)` - Metadata URI
- `get-token-metadata(token-id)` - Full on-chain metadata
- `get-cert-for-module(recipient, module-id)` - Check certificate ownership

## Project Structure

```
contract/
├── contracts/
│   └── stacks-academy-cert.clar    # Main contract
├── tests/
│   └── stacks-academy-cert.test.ts # Test suite (45 tests)
├── scripts/
│   └── deploy-testnet.ts           # Deployment script
├── settings/
│   ├── Devnet.toml                 # Local devnet config
│   └── Testnet.toml                # Testnet config (gitignored)
├── Clarinet.toml                   # Clarinet configuration
├── package.json                    # Dependencies and scripts
└── DEPLOYMENT.md                   # Deployment guide
```

## Development

### Running Local Devnet
```bash
clarinet devnet start
```

### Contract Validation
```bash
clarinet check
```

### Test Coverage
All contract functions are tested with 45 comprehensive tests covering:
- Minting logic and access control
- Transfer functionality
- Metadata retrieval
- Edge cases and boundary conditions
- Security and access control
- SIP-009 compliance

## Resources

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language](https://docs.stacks.co/clarity/)
- [SIP-009 NFT Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-standard.md)
- [Clarinet SDK](https://github.com/hirosystems/clarinet)
