// npm test
import { EnsResolver, namehash } from 'ethers';
import { setup } from './helpers/utils.ts';

async function main() {
    const { foundry, verifier, prover, ccip } = await setup();

    // ethers.js debug hook
    foundry.provider.on("debug", (data) => {
        //console.log("Debug event received:", data);
    });
   
    const NAME_TO_TEST = "test123.eth";
    const NODE = namehash(NAME_TO_TEST);

    const MY_ADDRESS = "0x000000000000000000000000ac50ce326de14ddf9b7e9611cd2f33a1af8ac039";
    const ANOTHER_ADDRESS = "0x00000000000000000000000081c11034FE2b2F0561e9975Df9a45D99172183Af";
    const ETH_COIN_TYPE = 60;
    const OPTIMISM_COIN_TYPE = 2147483658;

    // Deploy the L2 registry/profile storage
    const L2ProfileStorage = await foundry.deploy({
        file: './L2ProfileStorage.sol',
        args: [],
    });

    // Generate a profile ID
    const PROFILE_ID = await L2ProfileStorage.generateProfileId("thomas");

    // Set the profile records
    await foundry.confirm(
        L2ProfileStorage.setAddr(PROFILE_ID, ETH_COIN_TYPE, MY_ADDRESS)
    );

    await foundry.confirm(
        L2ProfileStorage.setAddr(PROFILE_ID, OPTIMISM_COIN_TYPE, ANOTHER_ADDRESS)
    );

    await foundry.confirm(
        L2ProfileStorage.setText(PROFILE_ID, "test", "testvalue")
    );

    const VITALIK_CONTENTHASH = "0xe30101701220e9506b1f5f304004c066f0e14cc39da8f980777ced7a8156aa49ba31780e2195";
    await foundry.confirm(
        L2ProfileStorage.setContenthash(PROFILE_ID, VITALIK_CONTENTHASH)
    );

    console.log("Contenthash: ", await L2ProfileStorage.getContenthash(PROFILE_ID));

    await foundry.confirm(
        L2ProfileStorage.register(NODE, PROFILE_ID)
    );

    console.log("ETH address: ", await L2ProfileStorage.getAddr(PROFILE_ID, ETH_COIN_TYPE));
    console.log("OPTIMISM address: ", await L2ProfileStorage.getAddr(PROFILE_ID, OPTIMISM_COIN_TYPE));
    //process.exit(0);

    const VERIFIER_ADDRESS = verifier.target;

    const chainId = (await foundry.provider.getNetwork()).chainId;

    // Deploy CrossChainResolver
    const Resolver = await foundry.deploy({
        file: './CrossChainResolver.sol',
        args: [VERIFIER_ADDRESS, L2ProfileStorage.target, chainId],
    });

    /*
    // You can use this to move the chain forward to use the finalized blockTag
    async function advanceBlocks(provider, numBlocks) {
        for (let i = 0; i < numBlocks; i++) {
            await provider.send("evm_mine", []);
        }
    }
    
    await foundry.provider.send("evm_setAutomine", [false]);
    await advanceBlocks(foundry.provider, 1);
    */

    async function resolve(name: string, coinType = 60) {

        // Instantiate the ethers.js EnsResolver which automatically decodes ENSIP-10 call responses
        const resolver = new EnsResolver(foundry.provider, Resolver.target, name);

        const [supportsWildcard, address, addressEth, text, contenthash] = await Promise.all([
          resolver.supportsWildcard(),
          resolver.getAddress(coinType),
          resolver.getAddress(),
          resolver.getText("test"),
          resolver.getContentHash()
        ]);
        console.log({
          name,
          supportsWildcard,
          address,
          addressEth,
          text,
          contenthash
        });
    }

    await resolve(NAME_TO_TEST, 10);

    // Shutdown
    foundry.shutdown();
    ccip.shutdown();
}

main().then(() => console.log('Example ran successfully!')); 