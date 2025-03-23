import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseGwei, toBytes } from "viem";

// Define types for contract return values
type MessageResult = [Uint8Array[], bigint[]];

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

  function padMessage(message: string, length: number = 60): Uint8Array {
    // Convert string to bytes
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // Create a result array of the exact size
    const result = new Uint8Array(length);

    // Fill with spaces (ASCII 32)
    result.fill(32);

    // Copy the message bytes into the result
    result.set(messageBytes.slice(0, length));

    return result;
  }

  function convertToString(bytes: Uint8Array): string {
    // Convert bytes to string
    const decoder = new TextDecoder("ascii");
    return decoder
      .decode(bytes)
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

      // Retrieve all messages
      const result =
        (await messageStorage.read.getAllMessages()) as MessageResult;
      const messages = result[0];
      const timestamps = result[1];

      // Check the stored message
      const storedMessage = convertToString(messages[0]);
      expect(storedMessage.trim()).to.equal(message);

      // Check timestamp is non-zero
      expect(Number(timestamps[0])).to.be.greaterThan(0);
    });

    it("Should handle multiple messages in circular buffer", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      // Store 12 messages (more than the buffer capacity of 10)
      for (let i = 0; i < 12; i++) {
        const message = `Message number ${i + 1} for testing circular buffer`;
        const paddedMessage = padMessage(message);
        await messageStorage.write.storeMessage([paddedMessage]);
      }

      // Current index should have wrapped around to 2
      const currentIndex = await messageStorage.read.getCurrentIndex();
      expect(currentIndex).to.equal(2n);

      // Retrieve all messages
      const result =
        (await messageStorage.read.getAllMessages()) as MessageResult;
      const messages = result[0];
      const timestamps = result[1];

      // Check that older messages were overwritten
      // The 0th and 1st slots should contain messages 11 and 12
      expect(convertToString(messages[0]).trim()).to.equal(
        "Message number 11 for testing circular buffer"
      );
      expect(convertToString(messages[1]).trim()).to.equal(
        "Message number 12 for testing circular buffer"
      );

      // And the rest should be messages 3-10
      for (let i = 2; i < 10; i++) {
        expect(convertToString(messages[i]).trim()).to.equal(
          `Message number ${i + 1} for testing circular buffer`
        );
      }
    });

    it("Should reject messages that don't match the required length", async function () {
      const { messageStorage } = await deployMessageStorageFixture();

      // Too short message
      const shortMessage = padMessage("Too short", 30); // Only 30 bytes

      // Too long message
      const longMessage = padMessage(
        "This message is way too long for our storage",
        70
      ); // 70 bytes

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

      // Retrieve all messages
      const result =
        (await messageStorage.read.getAllMessages()) as MessageResult;
      const messages = result[0];
      const timestamps = result[1];

      // Check all stored messages
      for (let i = 0; i < testMessages.length; i++) {
        expect(convertToString(messages[i]).trim()).to.equal(testMessages[i]);
        expect(Number(timestamps[i])).to.be.greaterThan(0);
      }

      // Check that remaining slots have empty messages (but still valid bytes arrays)
      for (let i = testMessages.length; i < 10; i++) {
        expect(messages[i].length).to.equal(60);
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
