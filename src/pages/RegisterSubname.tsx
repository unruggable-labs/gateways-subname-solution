import { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  TextField, 
  Paper 
} from '@mui/material';
import { 
  Contract, 
  keccak256, 
  toUtf8Bytes, 
  ZeroAddress, 
  ZeroHash,
  namehash, 
  JsonRpcProvider
} from 'ethers';
import RegisterSubnameComponent from '../components/RegisterSubnameComponent';
import { 
  ChainConfig, 
  l2Chains, 
  l2TestnetChains 
} from '../constants';
import { useDebounce } from '../hooks/useDebounce';

import { 
	useAppKitNetwork,
} from '@reown/appkit/react'
import { AppKitNetwork } from '@reown/appkit/networks';

const MAGIC_SLOT = keccak256(
  toUtf8Bytes("CrossChainResolver.v1")
);
const ENS_REGISTRY_ADDRESS = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

interface RegisterSubnameProps {
  l1ChainConfig: ChainConfig;
  showMore: boolean;
}

const RegisterSubname = ({ l1ChainConfig, showMore }: RegisterSubnameProps) => {
  // State
  const [ensName, setEnsName] = useState('');(null);
  const [deployedL2Address, setDeployedL2Address] = useState<string>('');
  const [deployedL2ChainId, setDeployedL2ChainId] = useState<number | null>(null);
  const [deployedL2ChainConfig, setDeployedL2ChainConfig] = useState<AppKitNetwork | null>(null);
  //const [deployedResolverAddress, setDeployedResolverAddress] = useState<string>('');

  // New state for validation flow
  const [validationLogs, setValidationLogs] = useState<Array<{ message: string, timestamp: Date }>>([{ message: 'Ready.', timestamp: new Date() }]);
  const [isValidating, setIsValidating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  // Add ref for the log container
  const logContainerRef = useRef<HTMLDivElement>(null);

  const {switchNetwork } = useAppKitNetwork()

  // Add effect to scroll to bottom when logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [validationLogs]);

  // Add log message
  const addLog = (message: string) => {
    setValidationLogs(logs => [...logs, { message, timestamp: new Date() }]);
  };

  // Use the useDebounce hook instead of the inline effect
  const debouncedEnsName = useDebounce(ensName, 1000);

  // Validation effect
  useEffect(() => {
    const validateResolver = async () => {
      if (!debouncedEnsName) return;

      setIsValidating(true);
      setIsValidated(false);
      setValidationLogs([]);

      try {
        addLog('Connecting to provider...');
        const provider = new JsonRpcProvider(l1ChainConfig.rpcUrl);

        addLog('Checking if name is registered...');
        const registry = new Contract(
          ENS_REGISTRY_ADDRESS,
          [
            'function owner(bytes32) view returns (address)',
            'function resolver(bytes32) view returns (address)'
          ],
          provider
        );

        const node = namehash(debouncedEnsName);
        const owner = await registry.owner(node);

        if (owner === ZeroAddress) {
          addLog('❌ This ENS name is not registered');
          return;
        }

        addLog('✅ ENS name is registered');

        addLog('Looking up resolver...');
        const resolver = await registry.resolver(node);

        if (resolver === ZeroAddress) {
          addLog('❌ No resolver found for this name');
          return;
        }

        addLog(`Resolver found at ${resolver}. (${l1ChainConfig.etherscanUrl}/address/${resolver})`);
        //setDeployedResolverAddress(resolver);

        addLog('Checking magic slot...');
        const slotValue = await provider.getStorage(resolver, MAGIC_SLOT);
        
        if (slotValue !== ZeroHash) {
          addLog('✅ Valid CrossChainResolver detected');
          setIsValidated(true);
        } else {
          addLog('❌ The resolver for this ENS name is not a valid CrossChainResolver. This registration interface only works with subnames of ENS names that are setup using this solution.');
          return;
        }

        const resolverContract = new Contract(resolver, ['function getStorageConfig() view returns (uint256, address)'], provider);

        const [chainId, profileStorageAddress] = await resolverContract.getStorageConfig();
        const chainConfig = l1ChainConfig.isTestnet 
          ? l2TestnetChains.find(c => c.chainId === Number(chainId))
          : l2Chains.find(c => c.chainId === Number(chainId));

        if (!chainConfig) {
          return;
        }
        
        addLog('Profile storage is on Chain ID: ' + chainId.toString() + (chainConfig ? ` (${chainConfig.name})` : ''));
        addLog(`Profile storage address: ${profileStorageAddress}. (${chainConfig?.etherscanUrl}/address/${profileStorageAddress})`);

        setDeployedL2Address(profileStorageAddress);
        setDeployedL2ChainId(Number(chainId));
        setDeployedL2ChainConfig(chainConfig.appkitChain);

        // Switch to the L2 chain
        addLog(`Switching to L2 chain (${chainConfig.name || chainId.toString()})...`);
        await switchNetwork(chainConfig.appkitChain);
        addLog(`✅ Switched to ${chainConfig?.name || chainId.toString()}`);

      } catch (error) {
        addLog(`❌ Error: ${(error as Error).message}`);
      } finally {
        setIsValidating(false);
      }
    };

    validateResolver();
  }, [debouncedEnsName]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Register ENS Subname
      </Typography>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Enter an ENS name that you would like to register a subname of.
      </Typography>

      {showMore && (
        <Paper variant="outlined" sx={{ mt: 2, mb: 2, p: 2 }}>
          <Typography variant="body2" sx={{
            '& a': {
              color: '#1565c0',
              textDecoration: 'underline',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'none'
              }
            }
          }}>
            We use a magic slot to detect if the resolver for the name you input is a valid CrossChainResolver - the resolver deployed by this solution.
          </Typography>
        </Paper>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="ENS Name"
          value={ensName}
          onChange={(e) => setEnsName(e.target.value.toLowerCase())}
          placeholder="example.eth"
          disabled={isValidating}
        />
      </Box>

      {/* Console-like output */}
      <Paper 
        ref={logContainerRef}
        sx={{ 
          mb: 3, 
          p: 2, 
          bgcolor: '#1e1e1e', 
          color: '#fff', 
          fontFamily: 'monospace',
          minHeight: '200px',
          maxHeight: '300px',
          overflow: 'auto'
        }}
      >
        {validationLogs.map((log, i) => {
          // Split message into parts and URLs
          const parts = log.message.split(/(\(https?:\/\/[^)]+\))/);
          
          return (
            <Box key={i} sx={{ mb: 1 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#888',
                  display: 'inline',
                  mr: 1
                }}
              >
                [{log.timestamp.toLocaleTimeString()}]
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ display: 'inline' }}
              >
                {parts.map((part, j) => {
                  if (part.startsWith('(') && part.endsWith(')')) {
                    // Extract URL from parentheses
                    const url = part.slice(1, -1);
                    return (
                      <a
                        key={j}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#64b5f6',
                          textDecoration: 'none'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        View on Explorer
                      </a>
                    );
                  }
                  return part;
                })}
              </Typography>
            </Box>
          );
        })}
      </Paper>

      {/* Only show the registration form after validation */}
      {isValidated && (
        <RegisterSubnameComponent 
          ensName={ensName}
          deployedL2Address={deployedL2Address}
          deployedL2ChainConfig = {deployedL2ChainConfig}
        />
      )}
    </Container>
  );
};

export default RegisterSubname; 