import { GatewayRequest } from '@unruggable/gateways';
import { setup } from './helpers/utils.ts';
import { toUtf8String } from 'ethers';

async function main() {
    const { foundry, prover } = await setup();

    // Deploy L2ProfileStorage contract
    const L2Storage = await foundry.deploy({
        file: "L2ProfileStorage.sol"
    });

    // Set up test data
    const TEST_NODE = '0x0000000000000000000000000000000000000000000000000000000000000001';
    const PROFILE_ID = '0x0000000000000000000000000000000000000000000000000000000000000002';
    const ETH_ADDRESS = '0x1234567890123456789012345678901234567890';

    const TEST_TEXT_KEY = "textkey";
    const TEST_TEXT_VALUE = "textvalue";

    // Set up profile data on L2
    await foundry.confirm(L2Storage.setAddr(PROFILE_ID, 60, ETH_ADDRESS));
    await foundry.confirm(L2Storage.setText(PROFILE_ID, TEST_TEXT_KEY, TEST_TEXT_VALUE));
    await foundry.confirm(L2Storage.assignProfileToNode(TEST_NODE, PROFILE_ID));

    const P = await prover();

    // Demonstrate the gateway request pattern used by L1 resolver to read ETH address
    console.log('\nDemonstrating L1 resolver gateway request pattern:');

    console.log('Reading ETH address for node:', TEST_NODE);
    
    const request = new GatewayRequest(3)
        .setTarget(L2Storage.target)
        // Start at nodeProfiles mapping (slot 1)
        .setSlot(1)
        // Use TEST_NODE as key to get profileId
        .push(TEST_NODE)
        .follow()
        .read()
        .setOutput(0)
        // Use returned profileId to look up in profiles mapping (slot 0)
        .pushOutput(0)
        .setSlot(0)
        .follow()
        // Navigate to addresses mapping in Profile struct (offset 3)
        .offset(3)
        // Use coin type 60 (ETH) as key
        .push(60)
        .follow()
        .readBytes()
        .setOutput(1);
        
    const { vOutputs: addressOutputs } = await P.prove(request);
    console.log('Profile ID:', addressOutputs[0]);
    console.log('ETH Address:', addressOutputs[1]);


    const request2 = new GatewayRequest(2)
        .setTarget(L2Storage.target)
        // Start at nodeProfiles mapping (slot 1)
        .setSlot(1)
        // Use TEST_NODE as key to get profileId
        .push(TEST_NODE)
        .follow()
        .read()
        .setOutput(0)
        // Use returned profileId to look up in profiles mapping (slot 0)
        .pushOutput(0)
        .setSlot(0)
        .follow()
        // Navigate to text mapping in Profile struct (offset 3)
        .offset(1)
        // Use coin type 60 (ETH) as key
        .pushStr(TEST_TEXT_KEY)
        .follow()
        .readBytes()
        .setOutput(1);
    
    const { vOutputs: textOutputs } = await P.prove(request2);
    console.log('Profile ID:', textOutputs[0]);
    console.log('Text Record:', toUtf8String(textOutputs[1]));

    foundry.shutdown();
}

main().then(() => console.log('Example ran successfully!')); 