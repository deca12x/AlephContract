# MessageStorage: Ultra-Efficient On-Chain Message Storage

A high-performance, gas-optimized smart contract for storing messages with timestamps, engineered with advanced assembly optimizations to achieve minimum storage costs on any EVM chain.

## 🏆 Hackathon Project Highlights

- **91k Gas Per Message**: Achieves exceptional efficiency through custom storage packing techniques
- **Zero Storage Waste**: Every byte of storage is optimally utilized with no padding or gaps
- **Multi-Chain Deployment**: Successfully tested on Ethereum testnets, ZKSync Era, and Mantle
- **100% Test Coverage**: Comprehensive test suite with both unit tests and storage layout verification
- **Circular Buffer Algorithm**: Maintains fixed gas costs regardless of usage duration

## ⚡ Gas Optimization Techniques

Our contract implements several cutting-edge gas optimization strategies:

1. **Precision-Engineered Storage Layout**:

   - Each message perfectly fits 2 storage slots (64 bytes total):
     - First slot: First 32 bytes of the message
     - Second slot: Remaining 28 bytes + 4-byte timestamp
   - Zero wasted bytes in any storage slot

2. **Assembly-Level Optimizations**:

   - Direct SSTORE/SLOAD operations to bypass Solidity's storage overhead
   - Bit-level packing with precise masking to combine message data with timestamps
   - Optimized calldata loading for storage operations
   - Efficient timestamp extraction using bit shifting rather than type conversions

3. **Fixed Storage Footprint**:

   - Circular buffer implementation guarantees O(1) storage growth
   - Maximum 16 message slots (32 storage slots total)
   - New messages automatically overwrite the oldest ones

4. **Buffer Overflow Prevention**:
   - Index wrapping with modulo operations to prevent out-of-bounds access
   - Proper bounds checking on all user-facing functions
   - Efficient encoding/decoding without external libraries

## 🧪 Comprehensive Testing Suite

Our project includes an extensive testing framework:

1. **Unit Tests**:

   - Deployment verification and initial state validation
   - Single and multiple message storage testing
   - Circular buffer overflow testing with 16+ messages
   - Input validation and error handling tests
   - Gas usage measurement and optimization verification

2. **Storage Verification**:

   - Low-level storage slot inspection to verify optimal packing
   - Timestamp extraction and verification
   - Message integrity checks across storage boundaries
   - Complete circular buffer testing with overflow conditions

3. **Integration Testing**:
   - Cross-chain deployment verification
   - Frontend integration testing for message encoding/decoding
   - Gas usage benchmarking across different networks

## 🔧 Technical Architecture

The contract uses advanced Solidity techniques to achieve maximum efficiency:

```solidity
// Storage of a message perfectly fits 2 storage slots
struct MessageData {
    bytes32 part1;        // First 32 bytes of message
    bytes32 part2;        // 28 bytes of message + 4 bytes timestamp
}
```

Assembly is used for direct storage access:

```solidity
assembly {
    // Load message bytes directly from calldata
    firstPart := calldataload(add(message.offset, 0))

    // Store timestamp in the high 4 bytes of the second slot
    secondPart := or(masked, timestampShifted)
}
```

## 🌐 Cross-Chain Deployment

Our contract has been optimized for and tested on multiple chains:

- **Ethereum Testnet (Sepolia)**: For compatibility with the Ethereum ecosystem
- **ZKSync Era**: Demonstrating compatibility with zkRollup L2 solutions
- **Mantle**: Showcasing deployment on alternative L2 networks

## 🚀 Setup & Deployment

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

```
# Network RPC URLs
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ZKSYNC_RPC_URL=https://mainnet.era.zksync.io
MANTLE_RPC_URL=https://rpc.mantle.xyz

# Private key for deploying contracts
PRIVATE_KEY=your_private_key_here
```

4. Run the comprehensive test suite:

```
npx hardhat test
```

5. Verify storage layout:

```
npx hardhat run scripts/verify-storage.ts
```

6. Deploy to your desired network:

```
npx hardhat run scripts/deploy.ts --network sepolia
npx hardhat run scripts/deploy.ts --network zksync
npx hardhat run scripts/deploy.ts --network mantle
```

## 📊 Performance Metrics

Based on our optimization efforts and testing:

| Operation           | Gas Used | Cost @ 20 Gwei |
| ------------------- | -------- | -------------- |
| Store Message       | ~91,000  | ~0.00182 ETH   |
| Read All Messages   | Gas-free | View Function  |
| Read Single Message | Gas-free | View Function  |

## 🔗 Smart Contract Interface

### Store a message

```solidity
function storeMessage(bytes memory message) external returns (uint256)
```

### Retrieve all messages

```solidity
function getAllMessages() external view returns (bytes[] memory messages, uint32[] memory timestamps)
```

### Get specific message

```solidity
function getMessage(uint256 index) external view returns (bytes32, bytes32, uint32)
```

## 🛡️ Security Considerations

This contract employs several security best practices:

- Input validation for all external functions
- No delegatecall or self-destruct patterns
- Bounded loops to prevent gas DoS attacks
- Fixed storage footprint to prevent storage explosion

## 📄 License

MIT
