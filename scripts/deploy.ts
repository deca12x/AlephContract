import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Hex } from "viem";
import fs from "fs";
import path from "path";

// Define ZKSync chain explicitly
const zkSyncChain = {
  id: 324,
  name: "zkSync Era Mainnet",
  network: "zksync",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet.era.zksync.io"],
    },
    public: {
      http: ["https://mainnet.era.zksync.io"],
    },
  },
} as const; // Add const assertion

// main function
async function main() {
  console.log("Deploying MessageStorage contract...");

  const hre = await import("hardhat");
  const network = hre.network.name;
  console.log(`Deploying to network: ${network}`);

  // Get the network config
  let publicClient;
  let walletClient;

  if (network === "zksync") {
    // Use explicit chain config for ZKSync
    publicClient = await hre.viem.getPublicClient({ chain: zkSyncChain });
    walletClient = await hre.viem.getWalletClient({ chain: zkSyncChain });
  } else {
    // Default for other networks
    publicClient = await hre.viem.getPublicClient();
    walletClient = await hre.viem.getWalletClient();
  }

  const [account] = await walletClient.getAddresses();
  console.log(`Deploying from account: ${account}`);

  // Deploy MessageStorage
  const messageStorage = await hre.viem.deployContract("MessageStorage");

  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Save deployment info to file
  const deploymentDir = path.join(__dirname, "..", "deployments");
  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }

  // Save deployment info to network-specific file
  const deploymentPath = path.join(deploymentDir, `${network}.json`);
  const deploymentInfo = {
    network,
    address: messageStorage.address,
    deploymentTime: new Date().toISOString(),
    deployer: account,
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment complete!");
  console.log("Contract address saved to deployments folder");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
