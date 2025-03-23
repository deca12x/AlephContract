import { expect } from "chai";
import hre from "hardhat";
import {
  getAddress,
  parseGwei,
  toBytes,
  bytesToHex,
  pad,
  type Hex,
} from "viem";

// Define types for contract return values (updated for Viem's types)
type MessageResult = [readonly Hex[], readonly bigint[]];

describe("MessageStorage", function () {
  // We define a fixture to reuse the same setup in every test
  async function deployMessageStorageFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const messageStorage = await hre.viem.deployContract("MessageStorage");
    const publicClient = await hre.viem.getPublicClient();

    return {
      messageStorage,
      owner,
      otherAccount,
      publicClient,
    };
  }

  function padMessage(message: string, length: number = 60): Hex {
    // Convert string to bytes
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // Create a result array of the exact size
    const result = new Uint8Array(length);

    // Fill with spaces (ASCII 32)
    result.fill(32);

    // Copy the message bytes into the result
    result.set(messageBytes.slice(0, length));

    // Convert to hex string for contract
    return bytesToHex(result) as Hex;
  }

  function convertToString(bytes: Uint8Array | Hex): string {
    // If input is a hex string, convert to Uint8Array first
    const byteArray = typeof bytes === "string" ? toBytes(bytes) : bytes;

    // Convert bytes to string
    const decoder = new TextDecoder("ascii");
    return decoder
      .decode(byteArray)
      .replace(/\u0000/g, "")
      .trim();
  }

  describe("Deployment", function () {
    it("Should set the correct initial state", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      const currentIndex = await messageStorage.read.getCurrentIndex();
      expect(currentIndex).to.equal(0n);
    });
  });

  describe("Storing Messages", function () {
    it("Should store a single message correctly", async function () {
      const { messageStorage, owner } = await deployMessageStorageFixture();

      // Test message
      const message = "This is a test message for the storage contract.";
      const paddedMessage = padMessage(message);

      // Store the message
      const tx = await messageStorage.write.storeMessage([paddedMessage]);

      // Check the returned index
      const currentIndex = await messageStorage.read.getCurrentIndex();
      expect(currentIndex).to.equal(1n);

      // Retrieve the message using getMessage
      const result = await messageStorage.read.getMessage([0n]);
      const part1 = result[0]; // bytes32 part1
      const part2 = result[1]; // bytes32 part2 (includes timestamp)
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

      // Check the stored message
      expect(fullMessage.trim()).to.equal(message);

      // Check timestamp is non-zero
      expect(Number(timestamp)).to.be.greaterThan(0);
    });

    it("Should handle multiple messages in circular buffer", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      // Store 18 messages (more than the buffer capacity of 16)
      for (let i = 0; i < 18; i++) {
        const message = `Message number ${i + 1} for testing circular buffer`;
        const paddedMessage = padMessage(message);
        await messageStorage.write.storeMessage([paddedMessage]);
      }

      // Current index should have wrapped around to 2
      const currentIndex = await messageStorage.read.getCurrentIndex();
      expect(currentIndex).to.equal(2n);

      // Helper function to convert message parts to string
      function partsToString(part1: Hex, part2: Hex): string {
        const p1Str = Buffer.from(part1.slice(2), "hex")
          .toString("ascii")
          .replace(/\0/g, "");
        const p2WithoutTs = part2.slice(0, 2) + part2.slice(2, 58); // Remove timestamp
        const p2Str = Buffer.from(p2WithoutTs.slice(2), "hex")
          .toString("ascii")
          .replace(/\0/g, "");
        return (p1Str + p2Str).trim();
      }

      // Check individual messages
      const message0 = await messageStorage.read.getMessage([0n]);
      const message1 = await messageStorage.read.getMessage([1n]);

      // Check that older messages were overwritten
      // The 0th and 1st slots should contain messages 17 and 18
      expect(partsToString(message0[0], message0[1])).to.equal(
        "Message number 17 for testing circular buffer"
      );
      expect(partsToString(message1[0], message1[1])).to.equal(
        "Message number 18 for testing circular buffer"
      );

      // And the rest should be messages 3-16
      for (let i = 2; i < 16; i++) {
        const messageData = await messageStorage.read.getMessage([BigInt(i)]);
        expect(partsToString(messageData[0], messageData[1])).to.equal(
          `Message number ${i + 1} for testing circular buffer`
        );
      }
    });

    it("Should reject messages that don't match the required length", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      // Too short message
      const tooShortMessage = "Too short";
      const shortMessage = padMessage(tooShortMessage, 30); // Only 30 bytes

      // Too long message
      const tooLongMessage = "This message is way too long for our storage";
      const longMessage = padMessage(tooLongMessage, 70); // 70 bytes

      // Both should be rejected
      await expect(messageStorage.write.storeMessage([shortMessage])).to.be
        .rejected;
      await expect(messageStorage.write.storeMessage([longMessage])).to.be
        .rejected;
    });
  });

  describe("Retrieving Messages", function () {
    it("Should retrieve all stored messages with correct timestamps", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      // Store 5 messages
      const testMessages = [
        "First test message for retrieval testing",
        "Second test message with different content",
        "Third message to verify storage and retrieval",
        "Fourth message checking circular buffer behavior",
        "Fifth message to complete our test set",
      ];

      for (const msg of testMessages) {
        await messageStorage.write.storeMessage([padMessage(msg)]);
      }

      // Helper function to convert message parts to string
      function partsToString(part1: Hex, part2: Hex): string {
        const p1Str = Buffer.from(part1.slice(2), "hex")
          .toString("ascii")
          .replace(/\0/g, "");
        const p2WithoutTs = part2.slice(0, 2) + part2.slice(2, 58); // Remove timestamp
        const p2Str = Buffer.from(p2WithoutTs.slice(2), "hex")
          .toString("ascii")
          .replace(/\0/g, "");
        return (p1Str + p2Str).trim();
      }

      // Check each message individually
      for (let i = 0; i < testMessages.length; i++) {
        const msgData = await messageStorage.read.getMessage([BigInt(i)]);
        const fullMsg = partsToString(msgData[0], msgData[1]);
        const timestamp = msgData[2];

        expect(fullMsg).to.equal(testMessages[i]);
        expect(Number(timestamp)).to.be.greaterThan(0);
      }

      // Check that remaining slots return valid byte arrays
      for (let i = testMessages.length; i < 16; i++) {
        const emptyMsgData = await messageStorage.read.getMessage([BigInt(i)]);
        // Just verify we can access these slots without errors
        expect(emptyMsgData[0]).to.not.be.undefined;
        expect(emptyMsgData[1]).to.not.be.undefined;
      }
    });
  });

  describe("Gas Optimization", function () {
    it("Should use optimal gas for storing messages", async function () {
      const { messageStorage, publicClient } =
        await deployMessageStorageFixture();

      // Test message
      const message = "This is a gas optimization test message.";
      const paddedMessage = padMessage(message);

      // Store the message and measure gas
      const tx = await messageStorage.write.storeMessage([paddedMessage]);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: tx,
      });

      // Log the gas used for analysis
      console.log(`Gas used for storeMessage: ${receipt.gasUsed}`);

      // Gas should be reasonable - this is more of a logging test than an assertion
      expect(Number(receipt.gasUsed)).to.be.lessThan(150000);
    });
  });
});
