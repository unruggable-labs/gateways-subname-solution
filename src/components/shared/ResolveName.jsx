async function resolveName(provider, name, chainId = 60) {

    try {
    	const resolver = await provider.getResolver(name);
	    const address = await resolver.getAddress(chainId);

	    return address;

    } catch (e) {

        return null;
    }
}

import { useState, useEffect } from 'react';
import { JsonRpcProvider } from 'ethers';
import { styles } from '../../styles/common.styles';
import { CircularProgress } from '@mui/material';


export default function ResolveName({ name, network, displayOwner = false }) {
    console.log("eee", import.meta.env);

    const [resolvedAddress, setResolvedAddress] = useState(false);

    const explorerPrepend = network === "mainnet" ? "" : `${network}.`;
    const etherscanLink = resolvedAddress ? `https://${explorerPrepend}etherscan.io/address/${resolvedAddress}` : "";
    const ethtoolsLink = `https://ethtools.com/ethereum-name-service/ens-whois/${name}`;

    useEffect(() => {
        async function doResolve() {
            const provider = new JsonRpcProvider(`https://${network}.infura.io/v3/${import.meta.env.VITE_INFURA_API_KEY}`);
            const result = await resolveName(provider, name);
            setResolvedAddress(result);
        }

        doResolve();
    }, []);

    return (
        <span className='nx-text-center'>
            <p className = "nx-text-md">
                <a href={network == "mainnet" ? ethtoolsLink : etherscanLink} style={styles.blueLink}>{name}</a>
            </p>

            {resolvedAddress === false ? (
                <CircularProgress size={16} />
            ):(
                <>
                    {resolvedAddress !== null && (
                        <>
                            <p className = "nx-text-xs">            
                                <a href={etherscanLink} style={styles.normalLink}>{resolvedAddress}</a>
                            </p>
                        </>
                    )}
                </>
            )}
        </span>
    );
}