// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IProfile.sol";
import "./IRegistrationController.sol";

contract WhitelistRegistrationController is IRegistrationController {
    address public immutable owner;
    mapping(bytes32 => bool) public whitelist;

    event NameWhitelisted(bytes32 indexed node);

    constructor(bytes32[] memory initialNodes) {
        owner = msg.sender;
        for (uint i = 0; i < initialNodes.length; i++) {
            whitelist[initialNodes[i]] = true;
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function register(bytes32 node) external payable override {
        require(msg.value == 0, "Registration is free");
        require(whitelist[node], "Node not whitelisted");
    }

    function isRegistrationAllowed(bytes32 node, address profileOwner) public view override returns (bool) {
        return whitelist[node];
    }

    function addToWhitelist(bytes32 node) external onlyOwner {
        whitelist[node] = true;
        emit NameWhitelisted(node);
    }
} 