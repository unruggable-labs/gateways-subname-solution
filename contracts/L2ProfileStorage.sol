// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./IProfile.sol";
import "./IRegistrationController.sol";

contract L2ProfileStorage {
    // Mapping from profileId => Profile
    mapping(bytes32 => IProfile.Profile) private profiles;
    
    // Mapping from node => profileId
    mapping(bytes32 => bytes32) private nodeProfiles;

    address public owner;

    // Registration controller - adds registration conditional logic
    IRegistrationController public controller;

    // Events
    event TextRecordSet(bytes32 indexed profileId, string key, string value);
    event AddressChanged(bytes32 indexed profileId, uint256 coinType, bytes newAddress);
    event ContenthashSet(bytes32 indexed profileId, bytes contenthash);
    event ControllerSet(address indexed controller);
    event NameRegistered(bytes32 indexed node, bytes32 indexed profileId);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    // Modifier to ensure the profile owner is the caller
    modifier ensureProfileOwner(bytes32 profileId) {
        if (profiles[profileId].owner == address(0)) {
            profiles[profileId].owner = msg.sender;
        } else {
            require(profiles[profileId].owner == msg.sender, "Not profile owner");
        }
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Set the controller that adds registration conditional logic
    function setController(address _controller) external onlyOwner {
        controller = IRegistrationController(_controller);
        emit ControllerSet(_controller);
    }

    // Update the profile
    function updateProfile(bytes32 profileId, string[] calldata textKeys, string[] calldata textValues, uint256[] calldata coinTypes, bytes[] calldata addrs) public ensureProfileOwner(profileId) {
        _updateTextRecords(profileId, textKeys, textValues);
        _updateAddresses(profileId, coinTypes, addrs);
    }

    // Public setter for text records for a profile
    function updateTextRecords(bytes32 profileId, string[] calldata textKeys, string[] calldata textValues) public ensureProfileOwner(profileId)  {
        _updateTextRecords(profileId, textKeys, textValues);
    }

    // Internal setter for text records for a profile
    function _updateTextRecords(bytes32 profileId, string[] calldata textKeys, string[] calldata textValues) internal  {
        require(textKeys.length == textValues.length, "Text keys and values must be the same length");

        for (uint i = 0; i < textKeys.length; i++) {
            _setText(profileId, textKeys[i], textValues[i]);
        }
    }

    // Public setter for address records for a profile
    function updateAddresses(bytes32 profileId, uint256[] calldata coinTypes, bytes[] calldata addrs) public ensureProfileOwner(profileId) {
        _updateAddresses(profileId, coinTypes, addrs);
    }

    // Internal setter for address records for a profile
    function _updateAddresses(bytes32 profileId, uint256[] calldata coinTypes, bytes[] calldata addrs) internal {
        require(coinTypes.length == addrs.length, "Coin types and addresses must be the same length");
        for (uint i = 0; i < coinTypes.length; i++) {
            _setAddr(profileId, coinTypes[i], addrs[i]);
        }
    }   
    
    // Register a name and update the profile at the same time
    function register(bytes32 node, bytes32 profileId, string[] calldata textKeys, string[] calldata textValues, uint256[] calldata coinTypes, bytes[] calldata addrs) external payable ensureProfileOwner(profileId) {
        _updateAddresses(profileId, coinTypes, addrs);
        _updateTextRecords(profileId, textKeys, textValues);
        _register(node, profileId);
    }

    // Register a name
    function register(bytes32 node, bytes32 profileId) external payable ensureProfileOwner(profileId) {
        _register(node, profileId);
    }

    // Internal function to register a name
    function _register(bytes32 node, bytes32 profileId) internal {
        require(nodeProfiles[node] == 0, "Name already registered");
        require(profileId != 0, "Invalid profileId");
                
        uint256 payment = msg.value;
        if (address(controller) != address(0)) {
            // Use controller if set
            require(controller.isRegistrationAllowed(node, profiles[profileId].owner), "Registration not allowed");
            controller.register{value: msg.value}(node);
        } else {
            // Direct registration if no controller
            require(payment == 0, "Registration is free");
        }

        // Assign the profile to the node if we've gotten this far
        nodeProfiles[node] = profileId;

        emit NameRegistered(node, profileId);
    }


    // Helper function to generate a profileId from a key
    function generateProfileId(string calldata key) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(key));
    }
    
    function setText(bytes32 profileId, string calldata key, string calldata value) external payable ensureProfileOwner(profileId) {
        _setText(profileId, key, value);
    }

    // Internal setter for an individual text record
    function _setText(bytes32 profileId, string calldata key, string calldata value) internal {
        
        IProfile.Profile storage profile = profiles[profileId];
        
        // Check if this key already exists
        bool keyExists = false;
        for (uint i = 0; i < profile.textKeys.length; i++) {
            if (keccak256(bytes(profile.textKeys[i])) == keccak256(bytes(key))) {
                keyExists = true;
                break;
            }
        }
        
        // If key doesn't exist, add it to the keys array
        if (!keyExists) {
            profile.textKeys.push(key);
        }
        
        // Set the text record
        profile.textRecords[key] = value;
        
        emit TextRecordSet(profileId, key, value);
    }
    
    // Setter for an individual address record
    function setAddr(bytes32 profileId, uint256 coinType, bytes calldata newAddr) external payable ensureProfileOwner(profileId) {
        _setAddr(profileId, coinType, newAddr);
    }

    // Internal setter for an individual address record
    function _setAddr(bytes32 profileId, uint256 coinType, bytes calldata newAddr) internal {
        IProfile.Profile storage profile = profiles[profileId];
        
        // Check if this coin type already exists
        bool coinExists = false;
        for (uint i = 0; i < profile.coinTypes.length; i++) {
            if (profile.coinTypes[i] == coinType) {
                coinExists = true;
                break;
            }
        }
        
        // If coin type doesn't exist, add it to the array
        if (!coinExists) {
            profile.coinTypes.push(coinType);
        }
        
        // Set the address
        profile.addresses[coinType] = newAddr;
        
        emit AddressChanged(profileId, coinType, newAddr);
    }

    function setContenthash(bytes32 profileId, bytes calldata contenthash) external payable ensureProfileOwner(profileId) {
        _setContenthash(profileId, contenthash);
    }

    function _setContenthash(bytes32 profileId, bytes calldata contenthash) internal {
        profiles[profileId].contentHash = contenthash;
        emit ContenthashSet(profileId, contenthash);
    }
    
    // Gets the profile data for a node
    function getProfileForNode(bytes32 node) external view returns (
        bytes32 profileId,
        address profileOwner,
        string[] memory textKeys, 
        string[] memory textValues,
        uint256[] memory coinTypes, 
        bytes[] memory addrs
    ) {
        profileId = nodeProfiles[node];
        (profileOwner, textKeys, textValues, coinTypes, addrs) = getProfile(profileId);
    }

    // Gets the profile data for a profileId
    function getProfile(bytes32 profileId) public view returns (
        address profileOwner,
        string[] memory textKeys, 
        string[] memory textValues,
        uint256[] memory coinTypes, 
        bytes[] memory addrs
    ) {
        IProfile.Profile storage profile = profiles[profileId];
        profileOwner = profile.owner;

        (textKeys, textValues) = getAllTextRecords(profileId);
        (coinTypes, addrs) = getAllAddresses(profileId);
    }
    
    // Gets a text record for a specified profile ID
    function getText(bytes32 profileId, string calldata key) external view returns (string memory) {
        return profiles[profileId].textRecords[key];
    }
    
    // Gets an address record for a specified profile ID
    function getAddr(bytes32 profileId, uint256 coinType) external view returns (bytes memory) {
        return profiles[profileId].addresses[coinType];
    }
    
    // Gets all text records for a specified profile ID
    function getAllTextRecords(bytes32 profileId) public view returns (
        string[] memory keys,
        string[] memory values
    ) {
        IProfile.Profile storage profile = profiles[profileId];
        uint length = profile.textKeys.length;
        
        keys = new string[](length);
        values = new string[](length);
        
        for (uint i = 0; i < length; i++) {
            keys[i] = profile.textKeys[i];
            values[i] = profile.textRecords[keys[i]];
        }
        
        return (keys, values);
    }
    
    // Gets all address records for a specified profile ID
    function getAllAddresses(bytes32 profileId) public view returns (
        uint256[] memory types,
        bytes[] memory addrs
    ) {
        IProfile.Profile storage profile = profiles[profileId];
        uint length = profile.coinTypes.length;
        
        types = new uint256[](length);
        addrs = new bytes[](length);
        
        for (uint i = 0; i < length; i++) {
            types[i] = profile.coinTypes[i];
            addrs[i] = profile.addresses[types[i]];
        }
        
        return (types, addrs);
    }

    // Checks if a name is available for registration
    function isNameAvailable(bytes32 node) external view returns (bool) {
        bytes32 profileId = nodeProfiles[node];
        return profiles[profileId].owner == address(0);
    }
} 