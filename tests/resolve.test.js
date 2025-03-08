import { namehash, JsonRpcProvider } from 'ethers';
import { plugin } from "@ethers-ext/provider-plugin-multicoin";

async function main() {
    // Connect to Sepolia network
    const provider = new JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/o7ozMQjZy8f4vU04mJgpnk4lk2loQLfK');

    provider.attachPlugin(plugin);

    provider.on("debug", (data) => {
        //console.log("Debug event received:", data);
    });
    // The ENS name to resolve
    //const ensName = 'thomas.test123.eth';
    const ensName = 'thomas.smelltheroses.eth';

    console.log("Node:", namehash(ensName));

    try {
        // Get the resolver address for this name
        const resolver = await provider.getResolver(ensName);
        if (!resolver) {
            console.log('No resolver found for', ensName);
            return;
        }
        console.log('Resolver address:', resolver.address);

        //process.exit();
        
        for (let coinType of [/*0, 10,*/ 60]) {
            // Get various records
            console.log("coinType", coinType);
            try {
                const address = await resolver.getAddress(coinType);
                console.log('Address:', {coinType, address});
            } catch (error) {
                console.error('Error resolving ENS name:', error);
            }
        }
        process.exit();

        // Try to get text records
        const twitter = await resolver.getText('twitter');
        if (twitter) {
            console.log('Twitter:', twitter);
        }

        const email = await resolver.getText('email');
        if (email) {
            console.log('Email:', email);
        }

        const url = await resolver.getText('url');
        if (url) {
            console.log('URL:', url);
        }

        // Get content hash if exists
        const contentHash = await resolver.getContentHash();
        if (contentHash) {
            console.log('Content Hash:', contentHash);
        }

    } catch (error) {
        console.error('Error resolving ENS name:', error);
    }
}

main().catch(console.error); 