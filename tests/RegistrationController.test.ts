// npm test
import { namehash } from 'ethers';
import { setup } from './helpers/utils.ts';

async function main() {
    const { foundry, verifier, prover, ccip } = await setup();

    // ethers.js debug hook
    foundry.provider.on("debug", (data) => {
        //console.log("Debug event received:", data);
    });
   
    // Test data
    const NAME_TO_TEST = "test123.eth";
    const NODE = namehash(NAME_TO_TEST);

    const NAME_TO_TEST_2 = "test1234.eth";
    const NODE_2 = namehash(NAME_TO_TEST_2);

    // Deploy the controllers
    const PaidRegistrationController = await foundry.deploy({
        file: './PaidRegistrationController.sol',
        args: [1000000000000000n],
    });

    const WhitelistRegistrationController = await foundry.deploy({
        file: './WhitelistRegistrationController.sol',
        args: [[]],
    });

    // Deploy the L2 registry/profile storage
    const L2ProfileStorage = await foundry.deploy({
        file: './L2ProfileStorage.sol',
        args: [],
    });

    // Generate a profile ID
    const PROFILE_ID = await L2ProfileStorage.getProfileId("thomas");

    // Set the controller to the paid controller
    await foundry.confirm(
        L2ProfileStorage.setController(PaidRegistrationController.target)
    );

    // Register a name sending no ETH - Should fail
    try {
        await foundry.confirm(
            L2ProfileStorage.register(NODE, PROFILE_ID)
        );
    } catch (error) {
        console.log("Expected Error registering name");
    }

    // Register a name sending ETH - Should succeed
    await foundry.confirm(
        L2ProfileStorage.register(NODE, PROFILE_ID, {value: 1000000000000000n})
    );

    // Set the controller to the whitelist controller
    await foundry.confirm(
        L2ProfileStorage.setController(WhitelistRegistrationController.target)
    );

    // Register a taken name - Should fail
    try {
        await foundry.confirm(
            L2ProfileStorage.register(NODE, PROFILE_ID)
        );
    } catch (error) {
        //"Name already registered"
        console.log("Expected Error registering name", error.reason);
    }

    // Register an available but non-whitelisted name - Should fail
    try {
        await foundry.confirm(
            L2ProfileStorage.register(NODE_2, PROFILE_ID)
        );
    } catch (error) {
        //"Registration not allowed"
        console.log("Expected Error registering name2", error.reason);
    }

    // Add the name to the whitelist
    await foundry.confirm(
        WhitelistRegistrationController.addToWhitelist(NODE_2)
    );

    // Register the name - Should succeed
    await foundry.confirm(
        L2ProfileStorage.register(NODE_2, PROFILE_ID)
    );

    await foundry.confirm(
        L2ProfileStorage.setText(PROFILE_ID, "test", "testvalue")
    );

    await foundry.confirm(
        L2ProfileStorage.setAddr(PROFILE_ID, 60, "0x000000000000000000000000ac50ce326de14ddf9b7e9611cd2f33a1af8ac039")
    );

    const profile = await L2ProfileStorage.getProfileForNode(NODE_2);
    console.log("Profile: ", profile);
    
    // Shutdown
    foundry.shutdown();
    ccip.shutdown();
}

main().then(() => console.log('Example ran successfully!')); 