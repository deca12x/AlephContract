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
 * - Max 16 messages (32 storage slots total)
 * - Uses a circular buffer to overwrite oldest messages
 */
contract MessageStorage {
    // Constants for storage optimization
    uint256 private constant MAX_MESSAGES = 16;
    uint256 private constant MESSAGE_SIZE_BYTES = 60; // 60 characters
    uint256 private constant TIMESTAMP_SIZE_BYTES = 4; // uint32 timestamp
    uint256 private constant BYTES_PER_SLOT = 32; // Ethereum storage slot size

    // Storage variables
    uint256 private currentIndex; // Track the current position in the circular buffer

    // Data structures for storage
    struct MessageData {
        bytes32 part1;
        bytes32 part2; // 28 bytes of message + 4 bytes timestamp
    }

    // Message storage - explicitly map indices to data
    mapping(uint256 => MessageData) private messages;

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
    function storeMessage(bytes calldata message) external returns (uint256) {
        // Require exact message length
        require(
            message.length == MESSAGE_SIZE_BYTES,
            "Message must be exactly 60 bytes"
        );

        // Get current timestamp as uint32 (4 bytes)
        uint32 timestamp = uint32(block.timestamp);

        // Get the index where we'll store this message
        uint256 index = currentIndex;

        // Store the first 32 bytes in part1
        bytes32 firstPart;

        // Copy the first 32 bytes of the message
        assembly {
            firstPart := calldataload(add(message.offset, 0))
        }

        // Store the remaining 28 bytes and timestamp in part2
        bytes32 secondPart;

        // Shift timestamp to high bytes (first 4 bytes of the slot)
        uint256 timestampShifted = uint256(timestamp) << 224;

        assembly {
            // Load the remaining bytes starting from offset 32
            let remaining := calldataload(add(message.offset, 32))

            // Mask the remaining bytes to ensure only 28 bytes are used
            // This ensures we have space for the 4-byte timestamp
            let masked := and(
                remaining,
                0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff
            )

            // Combine with the timestamp
            secondPart := or(masked, timestampShifted)
        }

        // Store both parts in the mapping
        messages[index] = MessageData({part1: firstPart, part2: secondPart});

        // Emit event with index and timestamp
        emit MessageStored(index, timestamp);

        // Update index for next message (circular buffer)
        currentIndex = (currentIndex + 1) % MAX_MESSAGES;

        return index;
    }

    /**
     * @dev Retrieve all stored messages with their timestamps
     * @return messages Array of stored messages
     * @return timestamps Array of message timestamps
     */
    function getAllMessages()
        external
        view
        returns (bytes[] memory, uint32[] memory)
    {
        bytes[] memory allMessages = new bytes[](MAX_MESSAGES);
        uint32[] memory allTimestamps = new uint32[](MAX_MESSAGES);

        // Iterate through all message slots and extract data
        for (uint256 i = 0; i < MAX_MESSAGES; i++) {
            MessageData storage data = messages[i];

            // Create a new bytes array for this message
            bytes memory messageBytes = new bytes(MESSAGE_SIZE_BYTES);

            // Extract the timestamp from part2 (top 4 bytes)
            uint32 timestamp = uint32(uint256(data.part2) >> 224);

            // Copy the data to the messageBytes array using assembly
            assembly {
                // Copy first part
                mstore(add(messageBytes, 32), mload(data.slot))

                // Copy second part (mask out the timestamp)
                let secondSlot := mload(add(data.slot, 32))
                let maskedSecond := and(
                    secondSlot,
                    0x00000000ffffffffffffffffffffffffffffffffffffffffffffffffffffffff
                )
                mstore(add(messageBytes, 64), maskedSecond)
            }

            // Store the results
            allMessages[i] = messageBytes;
            allTimestamps[i] = timestamp;
        }

        return (allMessages, allTimestamps);
    }

    /**
     * @dev Get a specific stored message by index
     * @param index The index of the message to retrieve
     * @return part1 The first part of the message
     * @return part2 The second part of the message (includes timestamp)
     * @return timestamp The message timestamp
     */
    function getMessage(
        uint256 index
    ) external view returns (bytes32, bytes32, uint32) {
        require(index < MAX_MESSAGES, "Index out of bounds");

        MessageData storage data = messages[index];

        // Extract the timestamp from part2 (top 4 bytes)
        uint32 timestamp = uint32(uint256(data.part2) >> 224);

        return (data.part1, data.part2, timestamp);
    }

    /**
     * @dev Get the current index in the circular buffer
     * @return The current index
     */
    function getCurrentIndex() external view returns (uint256) {
        return currentIndex;
    }
}
