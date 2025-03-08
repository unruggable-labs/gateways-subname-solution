// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {GatewayFetcher, GatewayRequest} from "@unruggable/gateways/GatewayFetcher.sol";
import {GatewayFetchTarget} from "@unruggable/gateways/GatewayFetchTarget.sol";
import {IGatewayVerifier} from "@unruggable/gateways/IGatewayVerifier.sol";

contract CrossChainResolver is GatewayFetchTarget {
    using GatewayFetcher for GatewayRequest;

    // Function selectors
    bytes4 private constant ADDR_SELECTOR = 0x3b3b57de;  // addr(bytes32)
    bytes4 private constant ADDR_COINTYPE_SELECTOR = 0xf1cb7e06;  // addr(bytes32,uint256)
    bytes4 private constant TEXT_SELECTOR = 0x59d1d43c;  // text(bytes32,string)
    bytes4 private constant SUPPORTS_INTERFACE_SELECTOR = 0x01ffc9a7;  // supportsInterface(bytes4)
    bytes4 private constant RESOLVE_SELECTOR = 0x9061b923;  // resolve(bytes,bytes)
    bytes4 private constant CONTENTHASH_SELECTOR = 0xbc1c58d1;  // contenthash(bytes32)

    bytes private constant MAGIC_SLOT_IDENTIFIER = "CrossChainResolver.v1";

    IGatewayVerifier immutable _verifier;
    address immutable _l2ProfileStorage;

    constructor(IGatewayVerifier verifier, address l2ProfileStorage, uint256 dataChainId) {
        _verifier = verifier;
        _l2ProfileStorage = l2ProfileStorage;
        
        // Store magic value in a very specific slot
        // Use a unique slot number to avoid any conflicts
        bytes32 MAGIC_SLOT = keccak256(MAGIC_SLOT_IDENTIFIER);

        assembly {
            sstore(MAGIC_SLOT, dataChainId) // Store `value` at the computed storage slot
        }
    }

    // Getter for both chain ID and profile storage address
    function getStorageConfig() public view returns (uint256 chainId, address profileStorage) {
        bytes32 MAGIC_SLOT = keccak256(MAGIC_SLOT_IDENTIFIER);
        assembly {
            chainId := sload(MAGIC_SLOT)
        }
        profileStorage = _l2ProfileStorage;
    }

    function supportsInterface(bytes4 interfaceID) external pure returns (bool) {
        return interfaceID == SUPPORTS_INTERFACE_SELECTOR ||    // EIP-165
               interfaceID == RESOLVE_SELECTOR;                 // ENSIP-10
    }


    function resolve(bytes calldata name, bytes calldata data) external view returns(bytes memory) {
        
        // Extract the selector from the data
        bytes4 selector = bytes4(data);
        
        if (selector == ADDR_SELECTOR) { // addr(bytes32)

            uint256 coinType = 60; // Default to ETH address
            bool wantsBytes = false;

            (bytes32 node) = abi.decode(data[4:], (bytes32));


            resolveAddress(node, coinType, wantsBytes);
        } else if (selector == TEXT_SELECTOR) { // text(bytes32,string)
            (bytes32 node, string memory key) = abi.decode(data[4:], (bytes32, string));

             resolveText(node, key);
        } else if (selector == ADDR_COINTYPE_SELECTOR) { // addr(bytes32,uint256)

            (bytes32 node,uint256 coinType) = abi.decode(data[4:], (bytes32, uint256));
            bool wantsBytes = true;    
            resolveAddress(node, coinType, wantsBytes);
        } else if (selector == CONTENTHASH_SELECTOR) { // contenthash(bytes32)
            (bytes32 node) = abi.decode(data[4:], (bytes32));
            resolveContenthash(node);
        }
        
        revert("Unsupported function");
    }

    function resolveAddress(bytes32 node, uint256 coinType, bool wantsBytes) internal view returns (bytes memory) {

        GatewayRequest memory r = GatewayFetcher
            .newRequest(2)
            .setTarget(_l2ProfileStorage)
            // Start at slot 1 (nodeProfiles)
            .setSlot(1)
            // Read the profileId for the node
            .push(node)
            .follow()
            .read()
            .setOutput(0);

        // Push the profileId back onto the stack
        r = r.pushOutput(0)
            // Get the Profile assigned to that ID
            .setSlot(0)
            .follow()
            // Offset to the addresses mapping
            .offset(3)
            // Push the coinType onto the stack
            .push(coinType)
            // Read the text record value for that key
            .follow()
            // ENSIP-9 we store all addresses as bytes
            .readBytes()
            .setOutput(1);

        string[] memory urls = new string[](0);

        // Fetch the data using the gateway
        fetch(_verifier, r, this.addressCallback.selector, abi.encode(wantsBytes), urls);
    }

    function trimLeadingZeros(bytes memory data) public pure returns (bytes memory) {
        uint256 startIndex = 0;
        uint256 length = data.length;

        // Find the first non-zero byte
        while (startIndex < length && data[startIndex] == 0) {
            startIndex++;
        }

        // If all bytes are zero, return an empty bytes array
        if (startIndex == length) {
            return new bytes(0);
        }

        // Copy the trimmed data into a new bytes array
        bytes memory trimmed = new bytes(length - startIndex);
        for (uint256 i = startIndex; i < length; i++) {
            trimmed[i - startIndex] = data[i];
        }

        return trimmed;
    }

    function addressCallback(bytes[] calldata values, uint8, bytes calldata extraData) external pure returns (bytes memory) {

        bool wantsBytes = abi.decode(extraData, (bool));

        if (!wantsBytes) {
            return values[1];
        } else {
            return abi.encode(trimLeadingZeros(values[1]));
        }
    }

    function resolveText(bytes32 node, string memory key) internal view returns (bytes memory) {

        // Create a gateway request to read profile data
        GatewayRequest memory r = GatewayFetcher
            .newRequest(2)
            .setTarget(_l2ProfileStorage)
            // Start at slot 1 (nodeProfiles)
            .setSlot(1)
            // Read the profileId for the node
            .push(node)
            .follow()
            .read()
            .setOutput(0);

        // Push the profileId back onto the stack
        r = r.pushOutput(0)
            // Get the Profile assigned to that ID
            .setSlot(0)
            .follow()
            // Offset to the textRecords mapping
            .offset(1)
            // Push the key onto the stack
            .push(key)
            // Read the text record value for that key
            .follow()
            .readBytes()
            .setOutput(1);
        
        // Fetch the data using the gateway
        fetch(_verifier, r, this.textCallback.selector);
    }
    

    function textCallback(bytes[] calldata values, uint8, bytes calldata) external pure returns (bytes memory) {
        return abi.encode(values[1]);
    }


    function resolveContenthash(bytes32 node) internal view returns (bytes memory) {

        // Create a gateway request to read profile data
        GatewayRequest memory r = GatewayFetcher
            .newRequest(2)
            .setTarget(_l2ProfileStorage)
            // Start at slot 1 (nodeProfiles)
            .setSlot(1)
            // Read the profileId for the node
            .push(node)
            .follow()
            .read()
            .setOutput(0);

        // Push the profileId back onto the stack
        r = r.pushOutput(0)
            // Get the Profile assigned to that ID
            .setSlot(0)
            .follow()
            // Offset to the contenthash record
            .offset(5)
            .readBytes()
            .setOutput(1);
        
        // Fetch the data using the gateway
        fetch(_verifier, r, this.contenthashCallback.selector);
    }
    

    function contenthashCallback(bytes[] calldata values, uint8, bytes calldata) external pure returns (bytes memory) {
        return values[1];
    }
} 