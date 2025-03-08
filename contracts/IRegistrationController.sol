// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IProfile.sol";

interface IRegistrationController {

    // Any conditional logic for registration
    function register(bytes32 node) external payable;

    // Checks if a registration is allowed for a node and profile owner
    function isRegistrationAllowed(bytes32 node, address profileOwner) external view returns (bool);
} 