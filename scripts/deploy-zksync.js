// scripts/deploy-zksync.js
require("dotenv").config();
const { Wallet, Provider, utils } = require("zksync-web3");
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Path to the compiled contract JSON
const artifactPath = path.join(
  __dirname,
  "../artifacts-zk/contracts/MessageStorage.sol/MessageStorage.json"
);

async function main() {
  console.log("Deploying MessageStorage contract to ZKSync Era...");

  // Get private key from .env
  const PRIVATE_KEY = process.env.PRIVATE_KEY;
  if (!PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in .env file");
  }

  // Initialize the wallet
  const provider = new Provider("https://mainnet.era.zksync.io");
  const wallet = new Wallet(PRIVATE_KEY, provider);
  const deployer = wallet.address;
  console.log(`Deploying from account: ${deployer}`);

  // Load the contract artifact
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Deploy the contract using ZKSync specific method
  console.log("Deploying MessageStorage...");

  // Create deployment transaction
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );

  const messageStorage = await factory.deploy();
  await messageStorage.deployed();

  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Save deployment info to file
  const deploymentDir = path.join(__dirname, "../deployments");
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
    deployer,
    transactionHash: messageStorage.deployTransaction.hash,
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("Deployment complete!");
  console.log("Contract address saved to deployments folder");
}

// We recommend this pattern to handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
