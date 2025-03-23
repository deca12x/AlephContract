// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageStorage
 * @dev A gas-optimized contract for storing messages using assembly
 *
 * Storage Layout:
 * - Messages are ASCII encoded (1 byte per character)
 * - Each message is 60 characters (60 bytes)
 * - Each timestamp is 4 bytes (uint32)
 * - Total per message: 64 bytes (exactly 2 storage slots)
 * - Max 10 messages (20 storage slots total)
 * - Uses a circular buffer to overwrite oldest messages
 */
contract MessageStorage {
    // Constants for storage optimization
    uint256 private constant MAX_MESSAGES = 10;
    uint256 private constant MESSAGE_SIZE_BYTES = 60; // 60 characters
    uint256 private constant TIMESTAMP_SIZE_BYTES = 4; // uint32 timestamp
    uint256 private constant BYTES_PER_SLOT = 32; // Ethereum storage slot size

    // Storage variables
    uint256 private currentIndex; // Track the current position in the circular buffer

    // Event emitted when a new message is stored
    event MessageStored(uint256 indexed index, uint256 timestamp);

    constructor() {
        // Initialize the current index to 0
        currentIndex = 0;
    }

    /**
     * @dev Store a message with the current timestamp
     * @param message The ASCII message to store (must be exactly 60 characters)
     * @return The index where the message was stored
     */
    function storeMessage(bytes memory message) external returns (uint256) {
        // Require exact message length
        require(
            message.length == MESSAGE_SIZE_BYTES,
            "Message must be exactly 60 bytes"
        );

        // Get current timestamp as uint32 (4 bytes)
        uint32 timestamp = uint32(block.timestamp);

        // Calculate storage position
        // Each message takes 2 slots: slot N for first 32 bytes, slot N+1 for remaining 28 bytes + timestamp
        uint256 baseSlot = currentIndex * 2;

        // Use assembly for gas-efficient storage
        assembly {
            // Store first 32 bytes of the message
            // sstore(slot, value)
            sstore(baseSlot, mload(add(message, 32)))

            // Load the next 28 bytes of the message
            let secondSlotValue := mload(add(message, 64))

            // Shift the timestamp to the most significant 4 bytes position
            // and combine with the remaining 28 bytes of the message
            let timestampValue := shl(224, timestamp)
            let combinedValue := or(secondSlotValue, timestampValue)

            // Store the combined value
            sstore(add(baseSlot, 1), combinedValue)
        }

        // Emit event with index and timestamp
        emit MessageStored(currentIndex, timestamp);

        // Get the current index before updating it
        uint256 returnIndex = currentIndex;

        // Update index for next message (circular buffer)
        currentIndex = (currentIndex + 1) % MAX_MESSAGES;

        return returnIndex;
    }

    /**
     * @dev Retrieve all stored messages with their timestamps
     * @return messages Array of stored messages
     * @return timestamps Array of message timestamps
     */
    function getAllMessages()
        external
        view
        returns (bytes[] memory messages, uint32[] memory timestamps)
    {
        messages = new bytes[](MAX_MESSAGES);
        timestamps = new uint32[](MAX_MESSAGES);

        // Iterate through all message slots and extract data
        for (uint256 i = 0; i < MAX_MESSAGES; i++) {
            // Calculate base slot for this message
            uint256 baseSlot = i * 2;

            // Temporary arrays to store message parts
            bytes memory messagePart1 = new bytes(32);
            bytes memory messagePart2 = new bytes(28);
            uint32 timestamp;

            // Use assembly to efficiently read from storage
            assembly {
                // Load first 32 bytes from storage
                let firstSlot := sload(baseSlot)

                // Store first 32 bytes in messagePart1
                mstore(add(messagePart1, 32), firstSlot)

                // Load second slot containing 28 bytes of message + 4 bytes timestamp
                let secondSlot := sload(add(baseSlot, 1))

                // Extract the timestamp (most significant 4 bytes)
                timestamp := shr(224, secondSlot)

                // Clear the timestamp bits to get only the message part
                let messagePart := and(
                    secondSlot,
                    0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff
                )

                // Store remaining 28 bytes in messagePart2
                mstore(add(messagePart2, 32), messagePart)
            }

            // Combine message parts
            bytes memory fullMessage = new bytes(MESSAGE_SIZE_BYTES);
            for (uint256 j = 0; j < 32; j++) {
                fullMessage[j] = messagePart1[j];
            }
            for (uint256 j = 0; j < 28; j++) {
                fullMessage[j + 32] = messagePart2[j];
            }

            // Store the extracted data in the return arrays
            messages[i] = fullMessage;
            timestamps[i] = timestamp;
        }

        return (messages, timestamps);
    }

    /**
     * @dev Get the current index in the circular buffer
     * @return The current index
     */
    function getCurrentIndex() external view returns (uint256) {
        return currentIndex;
    }
}
