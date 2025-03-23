import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import "@matterlabs/hardhat-zksync-solc";
import "@matterlabs/hardhat-zksync-deploy";
import * as dotenv from "dotenv";

dotenv.config();

// Default private key for testing - NEVER use in production
const PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    // Ethereum testnet - Sepolia
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: [PRIVATE_KEY],
    },
    // ZKSync mainnet
    zksync: {
      url: process.env.ZKSYNC_RPC_URL || "https://mainnet.era.zksync.io",
      accounts: [PRIVATE_KEY],
      zksync: true,
      ethNetwork: "mainnet",
    },
    // Mantle mainnet
    mantle: {
      url: process.env.MANTLE_RPC_URL || "https://rpc.mantle.xyz",
      accounts: [PRIVATE_KEY],
    },
    // Local development network
    hardhat: {
      mining: {
        auto: true,
        interval: 0,
      },
      blockGasLimit: 30000000,
    },
  },
  zksolc: {
    version: "1.3.14",
    settings: {},
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
