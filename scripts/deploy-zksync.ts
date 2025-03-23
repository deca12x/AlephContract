import { Wallet } from "zksync-ethers";
import * as hre from "hardhat";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Provider } from "zksync-ethers";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying MessageStorage contract to ZKSync...");

  // Get private key from .env
  const privateKey = process.env.PRIVATE_KEY || "";
  if (!privateKey) {
    throw new Error("Missing PRIVATE_KEY in .env file");
  }

  // Initialize the wallet
  const provider = new Provider("https://mainnet.era.zksync.io");
  const wallet = new Wallet(privateKey, provider);
  console.log(`Deploying from account: ${wallet.address}`);

  // Create deployer
  const deployer = new Deployer(hre, wallet);

  // Load the artifact
  const artifact = await deployer.loadArtifact("MessageStorage");

  // Deploy the contract
  console.log("Deploying MessageStorage...");
  const messageStorage = await deployer.deploy(artifact, []);
  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Save deployment info to file
  const deploymentDir = path.join(__dirname, "..", "deployments");
  // Create directory if it doesn't exist
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir);
  }

  // Save deployment info to network-specific file
  const deploymentPath = path.join(deploymentDir, "zksync.json");
  const deploymentInfo = {
    network: "zksync",
    address: messageStorage.address,
    deploymentTime: new Date().toISOString(),
    deployer: wallet.address,
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment complete!");
  console.log("Contract address saved to deployments folder");
}

// We recommend this pattern to handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
