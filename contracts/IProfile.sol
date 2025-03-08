// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IProfile {
    struct Profile {
        address owner;
        // Text records (ENSIP-5)
        mapping(string => string) textRecords;
        string[] textKeys;
        
        // Address records (ENSIP-9)
        mapping(uint256 => bytes) addresses;
        uint256[] coinTypes;
        
        // Content hash (ENSIP-7)
        bytes contentHash;
    }
} 