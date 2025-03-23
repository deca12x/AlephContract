# Message Storage Smart Contract

A highly optimized Solidity smart contract for storing messages with timestamps, using assembly for gas efficiency.

## Features

- **Storage Optimization**: Uses inline assembly to perfectly align data with 32-byte storage slots
- **Message Storage Format**:
  - ASCII encoding (1 byte per character)
  - 60 characters per message (60 bytes)
  - 4 bytes for timestamp (uint32)
  - Total per message: 64 bytes (exactly 2 storage slots)
- **Circular Buffer**: Automatically overwrites the oldest messages when reaching the 16-message limit
- **Multi-Chain Deployment**: Configured for Ethereum testnets, ZKSync and Mantle mainnets

## Technical Architecture

The contract is designed with extreme gas efficiency in mind:

1. **Storage Layout**: Each message perfectly fits 2 storage slots:

   - First slot: First 32 bytes of the message
   - Second slot: Remaining 28 bytes of the message + 4-byte timestamp

2. **Circular Buffer Implementation**: When the message limit is reached, the contract starts overwriting the oldest messages, maintaining a fixed storage footprint.

3. **Assembly Optimization**: Uses inline assembly for direct storage access, avoiding Solidity's storage overhead.

## Prerequisites

- Node.js (v16+)
- NPM or Yarn
- Private key with funds on target networks

## Setup

1. Clone the repository:

```
git clone <repository-url>
cd AlephContract
```

2. Install dependencies:

```
npm install
```

3. Configure environment variables:
   Create a `.env` file with the following:

```
# Network RPC URLs
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io
MANTLE_RPC_URL=https://rpc.mantle.xyz

# Private key for deploying contracts (without 0x prefix)
PRIVATE_KEY=your_private_key_here
```

## Testing

Run the test suite to verify functionality:

```
npx hardhat test
```

Verify storage layout:

```
npx hardhat run scripts/verify-storage.ts
```

## Deployment

Deploy to Ethereum Sepolia testnet:

```
npx hardhat run scripts/deploy.ts --network sepolia
```

Deploy to ZKSync mainnet:

```
npx hardhat run scripts/deploy.ts --network zksync
```

Deploy to Mantle mainnet:

```
npx hardhat run scripts/deploy.ts --network mantle
```

Deployment information is saved to the `deployments` directory.

## Contract Interface

The contract provides two main functions:

### Store a message

```solidity
function storeMessage(bytes memory message) external returns (uint256)
```

- `message`: The ASCII message to store (must be exactly 60 bytes)
- Returns: The index where the message was stored

### Retrieve all messages

```solidity
function getAllMessages() external view returns (bytes[] memory messages, uint32[] memory timestamps)
```

- Returns: Two arrays containing all messages and their corresponding timestamps

## Integration Guide for Frontend

1. **Initialization**: Connect to the deployed contract address
2. **Storing Messages**:
   - Ensure messages are exactly 60 bytes (pad with spaces if shorter)
   - Encode as bytes
   - Call the `storeMessage` function
3. **Retrieving Messages**:
   - Call `getAllMessages`
   - Decode the returned bytes to ASCII
   - Use the timestamps for displaying time information

## Security Considerations

This contract intentionally has no access controls, as authentication is expected to be handled by the frontend. In production deployments, consider adding:

- Message sender validation
- Admin controls for managing the storage
- Event logging for auditability

## License

MIT
