import hre from "hardhat";
import { parseUnits } from "viem";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying MessageStorage contract...");

  // Get network information
  console.log(`Deploying to network: ${hre.network.name}`);

  // Get deployer wallet
  const [deployer] = await hre.viem.getWalletClients();
  const address = deployer.account.address;
  console.log(`Deploying from account: ${address}`);

  // Deploy the contract
  const messageStorage = await hre.viem.deployContract("MessageStorage");
  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Save deployment info to file for later reference
  const deploymentInfo = {
    network: hre.network.name,
    address: messageStorage.address,
    deployer: address,
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log("Deployment complete!");
  console.log("Contract address saved to deployments folder");
}

// We recommend this pattern to handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
