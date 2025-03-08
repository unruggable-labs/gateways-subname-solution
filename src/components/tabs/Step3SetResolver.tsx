import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  Tooltip 
} from '@mui/material';
import { toBigInt } from 'ethers/utils';
import { namehash } from 'ethers/hash';
import { Contract } from 'ethers/contract';
import { 
  ChainConfig, 
  ENS_REGISTRY_ABI, 
  ENS_REGISTRY_ADDRESS, 
  NAME_WRAPPER_ABI, 
  NAME_WRAPPER_ADDRESS 
} from '../../constants';
import { 
  BrowserProvider, 
  Eip1193Provider, 
  JsonRpcProvider 
} from 'ethers/providers';
import { ErrorBox } from '../shared/ErrorBox';
import { SuccessBox } from '../shared/SuccessBox';
import { useDebounce } from '../../hooks/useDebounce';
import { 
  useAppKitAccount, 
  useAppKitNetwork, 
  useAppKitProvider 
} from '@reown/appkit/react';

interface Step3SetResolverProps {
  l1ChainConfig: ChainConfig;
  deployedResolverAddress: string | null;
  onHasSetResolver?: (ensName: string) => void;
}

const Step3SetResolver: React.FC<Step3SetResolverProps> = ({
  l1ChainConfig,
  deployedResolverAddress,
  onHasSetResolver,
}) => {

  const [ensName, setEnsName] = useState<string>('');
  const debouncedEnsName = useDebounce(ensName, 500);

  const [isSettingResolver, setIsSettingResolver] = useState(false);

  const [isCheckingOwnership, setIsCheckingOwnership] = useState(false);
  const [ensError, setEnsError] = useState<string | null>(null);
  const [hasSetResolver, setHasSetResolver] = useState<boolean>(false);

  // Data about the debounced ENS name inputted by the user
  const [ensOwner, setEnsOwner] = useState<string | null>(null);
  const [isEnsWrapped, setIsEnsWrapped] = useState<boolean | null>(null);

  const {switchNetwork } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider('eip155') as { walletProvider: Eip1193Provider };
  const { 
    address: signerAddress, 
    isConnected,
    ...rest 
  } = useAppKitAccount()
  
  // Effect to check ownership when debounced name changes
  useEffect(() => {
    if (debouncedEnsName) {
      checkOwnership();
    }
  }, [debouncedEnsName]);

  // Checks name ownership and sets resolver if ownership is confirmed
  const setResolver = async () => {

    if (!signerAddress || !ensName || !deployedResolverAddress) return;
    if (!ensOwner || ensOwner.toLowerCase() !== signerAddress?.toLowerCase()) return;
    
    setIsSettingResolver(true);
    setEnsError(null);
    setHasSetResolver(false);
    
    try {

      await switchNetwork(l1ChainConfig.appkitChain);
      const provider = new BrowserProvider(walletProvider, l1ChainConfig.appkitChain.id);
      const newSigner = await provider.getSigner();

      let node = namehash(ensName);
      
      // Set resolver using appropriate contract
      let tx;
      if (isEnsWrapped) {
        const nameWrapperAddress = l1ChainConfig.isTestnet ? NAME_WRAPPER_ADDRESS.sepolia : NAME_WRAPPER_ADDRESS.mainnet;
        const nameWrapper = new Contract(
          nameWrapperAddress, 
          NAME_WRAPPER_ABI, 
          newSigner
        );
        tx = await nameWrapper.setResolver(node, deployedResolverAddress);
      } else {
        const registryAddress = l1ChainConfig.isTestnet ? ENS_REGISTRY_ADDRESS.sepolia : ENS_REGISTRY_ADDRESS.mainnet;
        const registry = new Contract(
          registryAddress, 
          ENS_REGISTRY_ABI, 
          newSigner
        );
        tx = await registry.setResolver(node, deployedResolverAddress);
      }
      
      await tx.wait();

      setHasSetResolver(true);

      onHasSetResolver?.(ensName);

    } catch (error) {
      console.error('Error setting resolver:', error);
      setEnsError((error as Error).message);
    } finally {
      setIsSettingResolver(false);
    }
  };

  // Checks if the debounced ENS name is wrapped or not, and discerns beneficial ownership
  const checkOwnership = async () => {
    if (!debouncedEnsName) return;
    
    setIsCheckingOwnership(true);
    setEnsError(null);
    setEnsOwner(null);
    setIsEnsWrapped(null);
    
    try {
      // Create a provider for the appropriate network
      const provider = new JsonRpcProvider(l1ChainConfig.rpcUrl);

      const registryAddress = l1ChainConfig.isTestnet ? ENS_REGISTRY_ADDRESS.sepolia : ENS_REGISTRY_ADDRESS.mainnet;
      const nameWrapperAddress = l1ChainConfig.isTestnet ? NAME_WRAPPER_ADDRESS.sepolia : NAME_WRAPPER_ADDRESS.mainnet;
      
      const registry = new Contract(
        registryAddress, 
        ENS_REGISTRY_ABI, 
        provider
      );
      const nameWrapper = new Contract(
        nameWrapperAddress, 
        NAME_WRAPPER_ABI, 
        provider
      );
      
      // Calculate namehash
      const node = namehash(debouncedEnsName);
      
      let owner = await registry.owner(node);
      let isWrapped = false;
      
      if (owner.toLowerCase() == nameWrapperAddress.toLowerCase()) {
        const tokenId = toBigInt(node);
        const data = await nameWrapper.getData(tokenId);
        owner = data[0]; // owner from getData
        isWrapped = true;
      }
      
      setEnsOwner(owner);
      setIsEnsWrapped(isWrapped);
      
      if (owner.toLowerCase() !== signerAddress?.toLowerCase()) {
        setEnsError(`This ENS name is ${isWrapped ? 'wrapped and ' : ''}owned by ${owner}`);
      }
      
      return { owner, isWrapped };
    } catch (error: any) {
      console.error('Error checking ownership:', error);
      setEnsError('Error checking ENS ownership');
      setEnsOwner('');
      return null;
    } finally {
      setIsCheckingOwnership(false);
    }
  };

  const isSetResolverDisabled = Boolean(
    !signerAddress || 
    !ensName || 
    !deployedResolverAddress || 
    isSettingResolver ||
    isCheckingOwnership ||
    (ensOwner && ensOwner.toLowerCase() !== signerAddress?.toLowerCase())
  )

  // Tooltip for the 'Set Resolver button
  const setResolverTooltip = !deployedResolverAddress 
  ? "Please complete Step 2 first" 
  : !ensName 
  ? "Please enter an ENS name" 
  : !signerAddress
  ? "Please connect your wallet"
  : ensOwner && ensOwner.toLowerCase() !== signerAddress?.toLowerCase() 
  ? "You don't own this name" 
  : null;

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Set Resolver for ENS Name
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        <strong>Note:</strong> You must be the owner of the ENS name to set its resolver. Make sure that you are connected with the correct wallet.
      </Typography>

      {!hasSetResolver ? (

      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          label="ENS Name"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value)}
          placeholder="example.eth"
          sx={{ mb: 2 }}
        />
        {isCheckingOwnership ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">
              Checking ownership of {ensName}...
            </Typography>
          </Box>
        ) : ensOwner && (
          ensOwner.toLowerCase() === signerAddress?.toLowerCase() ? (
            <SuccessBox>
              ✓ You own this name. {/*isEnsWrapped ? (
                <>
                  (<strong>is wrapped</strong> in{' '}
                  <a href="https://docs.ens.domains/wrapper/overview" target="_blank" rel="noopener noreferrer">
                    Name Wrapper
                  </a>)
                </>
              ) : '(unwrapped)'*/}
            </SuccessBox>
          ) : (
            <ErrorBox>
              {!signerAddress ? (
                <>✕ Please connect your wallet to check ownership</>
              ) : isEnsWrapped ? (
                <>
                  ✕ This <strong> wrapped</strong> ENS name is
                  owned by{' '}
                  <a 
                    href={`${l1ChainConfig.etherscanUrl}/address/${ensOwner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ensOwner}
                  </a>
                </>
              ) : (
                <>
                  ✕ This ENS name is owned by{' '}
                  <a 
                    href={`${l1ChainConfig.etherscanUrl}/address/${ensOwner}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {ensOwner}
                  </a>{'. '}
                  Connect with the owner's wallet to proceed.
                </>
              )}
            </ErrorBox>
          )
        )}
        {(() => {

          const button = (
            <Button
              variant="contained"
              onClick={setResolver}
              disabled={isSetResolverDisabled}
              sx={{ mr: 1 }}
            >
              {isSettingResolver ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                "Set Resolver"
              )}
            </Button>
          );

          return setResolverTooltip ? (
            <Tooltip title={setResolverTooltip} arrow>
              <span style={{ display: 'inline-block' }}>{button}</span>
            </Tooltip>
          ) : button;
        })()}
      </Box>
      ) :  (
        <SuccessBox>
          You successfully set the resolver for <strong>{ensName}</strong> to <a 
                    href={`${l1ChainConfig.etherscanUrl}/address/${deployedResolverAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {deployedResolverAddress}
                  </a>{' '}
        </SuccessBox>
      )}
    </Box>
  );
};

export default Step3SetResolver; 