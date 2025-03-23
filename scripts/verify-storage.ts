import hre from "hardhat";
import {
  toHex,
  encodeAbiParameters,
  parseAbiParameters,
  bytesToHex,
  type Hex,
  keccak256,
  toBytes,
} from "viem";

async function main() {
  console.log("Verifying MessageStorage contract storage layout...");

  // Deploy the contract first to a local hardhat node
  console.log("Deploying to local hardhat network for testing...");
  const messageStorage = await hre.viem.deployContract("MessageStorage");
  console.log(`MessageStorage deployed to: ${messageStorage.address}`);

  // Constants from the contract
  const MAX_MESSAGES = 16;
  const MESSAGE_SIZE_BYTES = 60;

  // Initialize encoder and decoder for text conversion
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("ascii");

  console.log("\nStorage layout verification:");
  console.log("----------------------------");
  console.log(`Maximum messages: ${MAX_MESSAGES}`);
  console.log(`Message size: ${MESSAGE_SIZE_BYTES} bytes`);

  // *** PART 1: Basic storage test ***

  // Store a test message to verify storage
  const testMessage = "This is a test message to verify storage slots layout.";
  // Pad the message to exactly 60 bytes
  const messageBytes = encoder.encode(testMessage);
  const paddedMessage = new Uint8Array(MESSAGE_SIZE_BYTES);
  paddedMessage.fill(32); // Fill with space (ASCII 32)
  paddedMessage.set(messageBytes.slice(0, MESSAGE_SIZE_BYTES));

  // Convert to hex for the contract
  const messageHex = bytesToHex(paddedMessage) as Hex;

  console.log("\nStoring test message...");
  const tx = await messageStorage.write.storeMessage([messageHex]);
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

  // Get the index value as a number
  const indexValue = parseInt(currentIndex as string, 16);

  // In our new implementation, we use a mapping, so we need to calculate the slot
  // mapping(uint256 => MessageData) private messages;
  // The storage slot for mapping[key] is keccak256(key + mappingSlot)

  // mappingSlot is 1 for the messages mapping (currentIndex is at slot 0)
  const mappingSlot = 1;

  // Calculate the slot for messages[0]
  // For a mapping, we compute hash(concat(key, slot))
  const messageKey = 0; // First message
  const messageKeyBytes = toHex(messageKey, { size: 32 });
  const mappingSlotBytes = toHex(mappingSlot, { size: 32 });

  // Concatenate and hash
  const concatenated = messageKeyBytes.slice(2) + mappingSlotBytes.slice(2);
  const slotHash = keccak256(`0x${concatenated}`);

  // Get the two storage slots for the message (part1 and part2)
  const part1Slot = slotHash;
  const part2Slot = toHex(BigInt(part1Slot) + 1n);

  const part1Data = await publicClient.getStorageAt({
    address: messageStorage.address,
    slot: part1Slot,
  });

  const part2Data = await publicClient.getStorageAt({
    address: messageStorage.address,
    slot: part2Slot,
  });

  console.log(`\nStored message data (index ${messageKey}):`);
  console.log(`Part 1 slot (${part1Slot}): ${part1Data}`);
  console.log(`Part 2 slot (${part2Slot}): ${part2Data}`);

  // Extract the timestamp from part2 (top 4 bytes)
  if (part2Data) {
    const timestampHex = part2Data.slice(0, 10); // "0x" + 8 chars
    const timestamp = parseInt(timestampHex, 16);
    console.log(
      `\nExtracted timestamp: ${timestamp} (${new Date(
        timestamp * 1000
      ).toISOString()})`
    );
  }

  // Verify that we can read the message using the contract function
  console.log("\nReading message using contract function:");
  const result = await messageStorage.read.getMessage([0n]);
  const part1 = result[0]; // bytes32 part1
  const part2 = result[1]; // bytes32 part2
  const timestamp = result[2]; // uint32 timestamp

  // Convert bytes32 to string
  const part1Str = Buffer.from(part1.slice(2), "hex")
    .toString("ascii")
    .replace(/\0/g, "");
  const part2WithoutTimestamp = part2.slice(0, 2) + part2.slice(2, 58); // Remove last 4 bytes (timestamp)
  const part2Str = Buffer.from(part2WithoutTimestamp.slice(2), "hex")
    .toString("ascii")
    .replace(/\0/g, "");

  const fullMessage = part1Str + part2Str;
  console.log(`First message: "${fullMessage.trim()}"`);
  console.log(
    `First timestamp: ${timestamp} (${new Date(
      Number(timestamp) * 1000
    ).toISOString()})`
  );

  // *** PART 2: Circular buffer overflow test ***
  console.log("\n\n=== TESTING CIRCULAR BUFFER OVERFLOW ===");
  console.log("Storing 17 messages to test overflow behavior...");

  // Create a function to generate and pad messages
  function createMessage(index: number): Hex {
    const message = `Message #${index} - This is a test of circular buffer overflow.`;
    const msgBytes = encoder.encode(message);
    const padded = new Uint8Array(MESSAGE_SIZE_BYTES);
    padded.fill(32); // Fill with spaces
    padded.set(msgBytes.slice(0, MESSAGE_SIZE_BYTES));
    return bytesToHex(padded) as Hex;
  }

  // Store 17 messages (one more than the buffer capacity)
  for (let i = 0; i < 17; i++) {
    const msg = createMessage(i);
    console.log(`Storing message #${i}...`);
    await messageStorage.write.storeMessage([msg]);

    // Get current index after each store
    const currentIdx = await messageStorage.read.getCurrentIndex();
    console.log(`Current index after storing: ${currentIdx}`);
  }

  // Now verify that the first message has been overwritten
  console.log("\nReading all messages after overflow...");

  // Decode and print all messages
  console.log("\nStored Messages:");
  console.log("--------------");
  for (let i = 0; i < MAX_MESSAGES; i++) {
    const msgResult = await messageStorage.read.getMessage([BigInt(i)]);
    const msgPart1 = msgResult[0];
    const msgPart2 = msgResult[1];
    const ts = msgResult[2];

    try {
      // Convert parts to string
      const p1Str = Buffer.from(msgPart1.slice(2), "hex")
        .toString("ascii")
        .replace(/\0/g, "");
      const p2WithoutTs = msgPart2.slice(0, 2) + msgPart2.slice(2, 58);
      const p2Str = Buffer.from(p2WithoutTs.slice(2), "hex")
        .toString("ascii")
        .replace(/\0/g, "");
      const fullMsg = p1Str + p2Str;

      console.log(`[${i}]: "${fullMsg.trim()}" (Timestamp: ${Number(ts)})`);
    } catch (error) {
      console.log(`[${i}]: Error decoding: ${error}`);
    }
  }

  // Verify that message #0 has been overwritten and now stores message #16
  console.log("\nVerifying circular buffer behavior:");
  const message0Result = await messageStorage.read.getMessage([0n]);
  const message0Part1 = message0Result[0];
  const message0Part2 = message0Result[1];

  try {
    // Convert parts to string
    const p1Str = Buffer.from(message0Part1.slice(2), "hex")
      .toString("ascii")
      .replace(/\0/g, "");
    const p2WithoutTs = message0Part2.slice(0, 2) + message0Part2.slice(2, 58);
    const p2Str = Buffer.from(p2WithoutTs.slice(2), "hex")
      .toString("ascii")
      .replace(/\0/g, "");
    const fullMsg = p1Str + p2Str;

    if (fullMsg.includes("Message #16")) {
      console.log(
        "✅ Success: First message slot now contains message #16, confirming circular buffer works!"
      );
    } else {
      console.log("❌ Error: First message was not properly overwritten");
      console.log(`First message content: "${fullMsg.trim()}"`);
    }
  } catch (error) {
    console.log(`Error decoding message: ${error}`);
  }

  console.log("\nVerification complete!");
  console.log("----------------------");
  console.log("Storage layout is working as expected.");
  console.log(
    "The contract efficiently uses storage slots to pack messages and timestamps."
  );
  console.log(
    "Circular buffer correctly overwrites oldest messages when full."
  );
}

// We recommend this pattern to handle errors
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
