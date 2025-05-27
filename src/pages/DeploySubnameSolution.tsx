// Import Solidity files as raw text
import L2ProfileStorage from '../../contracts/L2ProfileStorage.sol?raw';
import CrossChainResolver from '../../contracts/CrossChainResolver.sol?raw';

import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import { JsonRpcSigner } from 'ethers';

import Step1L2Storage from '../components/tabs/Step1L2Storage';
import Step2L1Resolver from '../components/tabs/Step2L1Resolver';
import Step3SetResolver from '../components/tabs/Step3SetResolver';
import ContractDeployment from '../components/shared/ContractDeployment';

import { 
  l2Chains, 
  l2TestnetChains,
  DeployedContract,
  ChainConfig,
} from '../constants';

// Tab constants
const TABS = {
  L2_STORAGE: 0,
  L1_RESOLVER: 1,
  SET_RESOLVER: 2
} as const;

interface DeploySubnameSolutionProps {
  l1ChainConfig: ChainConfig;
  showMore: boolean;
}

function DeploySubnameSolution({ l1ChainConfig, showMore }: DeploySubnameSolutionProps) {
  // L2 Chain selection (step 1)
  const [selectedChain, setSelectedChain] = useState<string>('');

  // Step selection (tabs)
  const [selectedTab, setSelectedTab] = useState(0);

  // Reference to a web worker for compiling contracts
  const workerRef = useRef<Worker | null>(null);

  // Tracks the deployed contract for Step 1
  const [deployedL2Address, setDeployedL2Address] = useState<string | null>(null);

  // Tracks the deployed contract for Step 2
  const [deployedResolverAddress, setDeployedResolverAddress] = useState<string | null>(null);

  // Tracks the ENS name that has had its resolver set in Step 3
  const [ensName, setEnsName] = useState<string|null>(null);

  const [compiler, setCompiler] = useState<boolean>(false);
  const [compilerError, setCompilerError] = useState<string | null>(null);

  // Initialize the web worker for contract compilation
  useEffect(() => {
    console.log('Creating Web Worker...');
    // Create the Web Worker with classic type
    workerRef.current = new Worker(new URL('../compiler.worker.ts', import.meta.url), { type: 'classic' });
    
    // Set up message handler
    workerRef.current.onmessage = (e) => {
      console.log('Received message from worker:', e.data);
      if (e.data.type === 'COMPILER_LOADED') {
        console.log('Setting compiler state to true');
        setCompiler(true);
        setCompilerError(null);
      } else if (e.data.type === 'ERROR') {
        console.error('Compiler error:', e.data.error, e.data.details);
        setCompilerError(e.data.details?.map((error: any) => error.message).join('\n') || e.data.error);
      }
    };

    console.log('Sending LOAD_COMPILER message to worker');
    // Load the compiler
    workerRef.current.postMessage({ type: 'LOAD_COMPILER' });

    // Cleanup
    return () => {
      console.log('Cleaning up worker');
      workerRef.current?.terminate();
    };
  }, []);

  // Discern the chain configuration which we will pass to the ContractDeployment component
  const selectedChainConfig = l1ChainConfig.isTestnet ? l2TestnetChains.find(c => c.name === selectedChain) : l2Chains.find(c => c.name === selectedChain);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>

      <Typography variant="h4" gutterBottom>
        ENS Subname Solution Contract Generator
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        Generate and deploy contracts for offering subnames of your ENS names to your users/friends/community.
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Step 1: L2 Profile Storage" />
          <Tab label="Step 2: L1 ENS Resolver" />
          <Tab label="Step 3: Set Resolver" />
        </Tabs>
      </Box>

      <Box sx={{ display: selectedTab === TABS.L2_STORAGE ? 'block' : 'none' }}>

        <Step1L2Storage
          l1ChainConfig={l1ChainConfig}
          selectedChain={selectedChain}
          setSelectedChain={setSelectedChain}
          isTestnet={l1ChainConfig.isTestnet}
          showMore={showMore}
          deployedL2Address={deployedL2Address}
        />
        <ContractDeployment
          deploymentChainConfig={selectedChainConfig}
          deploymentTitle={"L2 Profile Storage Contract:"}
          showMore={showMore}
          compiler={compiler}
          compilerError={compilerError}
          contractSource={L2ProfileStorage}
          contractName={"L2ProfileStorage"}
          constructorArgs={[]}
          workerRef={workerRef}
          onDeploySuccess={(deployedContract: DeployedContract) => { setDeployedL2Address(deployedContract.address); }}
        />
      </Box>

      <Box sx={{ display: selectedTab === TABS.L1_RESOLVER ? 'block' : 'none' }}>

        <Step2L1Resolver
          isTestnet={l1ChainConfig.isTestnet}
          showMore={showMore}
        />
        <ContractDeployment
          deploymentChainConfig={l1ChainConfig}
          deploymentTitle={"L1 ENS Resolver Contract:"}
          showMore={showMore}
          compiler={compiler}
          compilerError={compilerError}
          contractSource={CrossChainResolver}
          contractName={"CrossChainResolver"}
          constructorArgs={deployedL2Address != null && selectedChainConfig != null ? [selectedChainConfig.verifier, deployedL2Address, selectedChainConfig.chainId.toString()] : []}
          workerRef={workerRef}
          isDeployDisabledParent={() => deployedL2Address == null}
          onDeploySuccess={(deployedContract: DeployedContract) => { setDeployedResolverAddress(deployedContract.address); }}
        />
      </Box>

      <Box sx={{ display: selectedTab === TABS.SET_RESOLVER ? 'block' : 'none' }}>
        <Step3SetResolver
          l1ChainConfig={l1ChainConfig}
          deployedResolverAddress={deployedResolverAddress}
          onHasSetResolver={(ensName: string) => { setEnsName(ensName); }}
          />
      </Box>
      
    </Container>
  );
}

export default DeploySubnameSolution; 