// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IProfile.sol";
import "./IRegistrationController.sol";

contract PaidRegistrationController is IRegistrationController {
    uint256 public immutable registrationFee;
    address public immutable owner;

    event FeesWithdrawn(uint256 amount);

    constructor(uint256 _registrationFee) {
        require(_registrationFee > 0, "Fee must be greater than 0");
        registrationFee = _registrationFee;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function register(bytes32 node) external payable override {
        require(msg.value >= registrationFee, "Insufficient payment");
    }

    function isRegistrationAllowed(bytes32 node, address profileOwner) public pure override returns (bool) {
        // Anyone can register if they pay the fee
        return true;
    }

    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
        
        emit FeesWithdrawn(balance);
    }
} 