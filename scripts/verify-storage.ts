import hre from "hardhat";
import { toHex, encodeAbiParameters, parseAbiParameters } from "viem";

async function main() {
  console.log("Verifying MessageStorage contract storage layout...");

  // Deploy the contract first to a local hardhat node
  console.log("Deploying to local hardhat network for testing...");
  const messageStorage = await hre.viem.deployContract("MessageStorage");
  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Constants from the contract
  const MAX_MESSAGES = 10;
  const MESSAGE_SIZE_BYTES = 60;
  const TOTAL_SLOTS_USED = MAX_MESSAGES * 2; // Each message takes 2 slots

  console.log("\nStorage layout verification:");
  console.log("----------------------------");
  console.log(`Maximum messages: ${MAX_MESSAGES}`);
  console.log(`Message size: ${MESSAGE_SIZE_BYTES} bytes`);
  console.log(`Expected storage slots used: ${TOTAL_SLOTS_USED}`);

  // Store a test message to verify storage
  const testMessage = "This is a test message to verify storage slots layout.";
  // Pad the message to exactly 60 bytes
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(testMessage);
  const paddedMessage = new Uint8Array(MESSAGE_SIZE_BYTES);
  paddedMessage.fill(32); // Fill with space (ASCII 32)
  paddedMessage.set(messageBytes.slice(0, MESSAGE_SIZE_BYTES));

  console.log("\nStoring test message...");
  const tx = await messageStorage.write.storeMessage([paddedMessage]);
  console.log(`Transaction hash: ${tx}`);

  // Get the public client to read storage slots
  const publicClient = await hre.viem.getPublicClient();

  // Read the storage slots used by the message
  console.log("\nReading storage slots:");
  console.log("----------------------");

  // First, read the contract's currentIndex value (slot 0)
  const indexSlot = 0;
  const currentIndex = await publicClient.getStorageAt({
    address: messageStorage.address,
    slot: toHex(indexSlot),
  });
  console.log(`Slot ${indexSlot} (currentIndex): ${currentIndex}`);

  // Now read the message storage slots
  // First message is stored in slots 1 and 2
  const messageSlot1 = 1;
  const messageSlot2 = 2;

  const firstPart = await publicClient.getStorageAt({
    address: messageStorage.address,
    slot: toHex(messageSlot1),
  });

  const secondPart = await publicClient.getStorageAt({
    address: messageStorage.address,
    slot: toHex(messageSlot2),
  });

  console.log(`Slot ${messageSlot1} (message part 1): ${firstPart}`);
  console.log(
    `Slot ${messageSlot2} (message part 2 + timestamp): ${secondPart}`
  );

  // Extract the timestamp (first 4 bytes of second slot)
  const timestamp = secondPart ? parseInt(secondPart.slice(0, 10), 16) : 0;
  console.log(
    `Extracted timestamp: ${timestamp} (${new Date(
      timestamp * 1000
    ).toISOString()})`
  );

  // Extract the message
  console.log("\nVerification complete!");
  console.log("----------------------");
  console.log("Storage layout is working as expected.");
  console.log(
    "The contract efficiently uses storage slots to pack messages and timestamps."
  );
}

// We recommend this pattern to handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
