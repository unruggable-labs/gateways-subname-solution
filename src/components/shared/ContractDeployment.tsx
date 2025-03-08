// Import Solidity files as raw text
import IProfile from '../../../contracts/IProfile.sol?raw';
import IRegistrationController from '../../../contracts/IRegistrationController.sol?raw';
import GatewayFetcher from "../../../node_modules/@unruggable/gateways/contracts/GatewayFetcher.sol?raw";
import GatewayFetchTarget from "../../../node_modules/@unruggable/gateways/contracts/GatewayFetchTarget.sol?raw";
import IGatewayVerifier from "../../../node_modules/@unruggable/gateways/contracts/IGatewayVerifier.sol?raw";
import GatewayRequest from "../../../node_modules/@unruggable/gateways/contracts/GatewayRequest.sol?raw";
import IGatewayProtocol from "../../../node_modules/@unruggable/gateways/contracts/IGatewayProtocol.sol?raw";

import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Tooltip, 
  Paper 
} from '@mui/material';
import { 
  CodeDisplay, 
  CodeLine 
} from './CodeHighlight';
import { 
  ChainConfig, 
  DeployedContract, 
  ETHERSCAN_API_URL
} from '../../constants';
import { 
  BrowserProvider, 
  ContractFactory, 
  Eip1193Provider 
} from 'ethers';
import { ErrorBox } from './ErrorBox';
import { SuccessBox } from './SuccessBox';

import { 
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitProvider 
} from '@reown/appkit/react'

interface ContractDeploymentProps {
  deploymentChainConfig: ChainConfig | undefined;
  deploymentTitle: string;
  showMore: boolean;
  compiler: boolean;
  compilerError: string | null;
  contractName: string;
  contractSource: string;
  constructorArgs: string[];
  workerRef: React.RefObject<Worker>;
  isDeployDisabledParent?: () => boolean;
  onDeploySuccess?: (deployedContract: DeployedContract) => void;
}

const ContractDeployment: React.FC<ContractDeploymentProps> = ({
  deploymentChainConfig,
  deploymentTitle,
  showMore,
  compiler,
  compilerError,
  contractName,
  contractSource,
  constructorArgs,
  workerRef,
  isDeployDisabledParent,
  onDeploySuccess
}) => {

  // Deployment status
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState<any | null>(null);
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [deployedContract, setDeployedContract] = useState<DeployedContract | null>(null);

  // Etherscan verification status
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<any | null>(null);

  const {chainId: connectedChainId, switchNetwork } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider('eip155') as { walletProvider: Eip1193Provider };
	const { 
		address: signerAddress, 
		isConnected,
		...rest 
	} 													= useAppKitAccount()
  

  // Handler for actually deploying the contract
  const deployContract = async () => {
    if (!signerAddress) return;
    if (!deploymentChainConfig) return;

    setIsDeploying(true);
    setDeploySuccess(null);
    setDeploymentError(null);

    try {

      const provider = new BrowserProvider(walletProvider, deploymentChainConfig.chainId);
      const newSigner = await provider.getSigner();

      const { abi, bytecode } = await compileContract(contractSource);
        
      const factory = new ContractFactory(
        abi,
        bytecode,
        newSigner
      );

      const contract = await factory.deploy(...constructorArgs);
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      // Encode the constructor arguments for Etherscan verification
      const encodedArgs = factory.interface.encodeDeploy(constructorArgs);


      const newDeployedContract: DeployedContract = {
        address: deployedAddress,
        source: contractSource,
        encodedArgs: encodedArgs,
        version: '0.8.19',
        optimization: true,
        runs: 200
      };
      // Save deployment info for verification
      setDeployedContract(newDeployedContract);
      // Notify parent component of deployment success
      onDeploySuccess?.(newDeployedContract);
        
      const explorerUrl = deploymentChainConfig?.etherscanUrl;
      const successMessage = (
        <>
          Contract deployed successfully! View it on <a href={`${explorerUrl}/address/${deployedAddress}#code`} target="_blank" rel="noopener noreferrer">Etherscan</a>
        </>
      );
      setDeploySuccess(successMessage);
     
    } catch (error) {
      console.error('Error deploying contract:', error);
      setDeploySuccess(null);
      setDeploymentError((error as Error).message);
    } finally {
      setIsDeploying(false);
    }
  };


  // Handler to have the worker compile the contract
  const compileContract = (source: string): Promise<{ abi: any, bytecode: string }> => {
    if (!workerRef.current) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const worker = workerRef.current!;

      const handler = (e: MessageEvent) => {
        if (e.data.type === 'COMPILED') {
          worker.removeEventListener('message', handler);
          const output = e.data.output;
          
          if (output.errors) {
            const errors = output.errors.filter((error: any) => error.severity === 'error');
            if (errors.length > 0) {
              console.error('Compilation errors:', errors);
              reject(new Error('Contract compilation failed'));
              return;
            }
          }

          const contractFile = output.contracts['contract.sol'];
          const contractName = Object.keys(contractFile)[0];
          const contract = contractFile[contractName];

          resolve({
            abi: contract.abi,
            bytecode: contract.evm.bytecode.object
          });
        } else if (e.data.type === 'ERROR') {
          worker.removeEventListener('message', handler);
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handler);

      worker.postMessage({
        type: 'COMPILE',
        input: {
          language: 'Solidity',
          sources: {
            'contract.sol': {
              content: source
            },
            'IProfile.sol': {
              content: IProfile
            },
            'IRegistrationController.sol': {
              content: IRegistrationController
            },
            '@unruggable/gateways/GatewayFetcher.sol': {
              content: GatewayFetcher
            },
            '@unruggable/gateways/GatewayFetchTarget.sol': {
              content: GatewayFetchTarget
            },
            '@unruggable/gateways/IGatewayVerifier.sol': {
              content: IGatewayVerifier
            },
            '@unruggable/gateways/GatewayRequest.sol': {
              content: GatewayRequest
            },
            '@unruggable/gateways/IGatewayProtocol.sol': {
              content: IGatewayProtocol
            },
            'node_modules/@unruggable/gateways/GatewayFetcher.sol': {
              content: GatewayFetcher
            },
            'node_modules/@unruggable/gateways/GatewayFetchTarget.sol': {
              content: GatewayFetchTarget
            },
            'node_modules/@unruggable/gateways/GatewayRequest.sol': {
              content: GatewayRequest
            },
            'node_modules/@unruggable/gateways/IGatewayProtocol.sol': {
              content: IGatewayProtocol
            },
            'node_modules/@unruggable/gateways/IGatewayVerifier.sol': {
              content: IGatewayVerifier
            },
            
          },
          settings: {
            outputSelection: {
              '*': {
                '*': ['*']
              }
            },
            remappings: [
              '@unruggable/gateways/=node_modules/@unruggable/gateways/'
            ],
            optimizer: {
              enabled: true,
              runs: 200
            }
          }
        }
      });
    });
  };

  // Handler to verify the contract on Etherscan
  const verifyContract = async () => {

    if (!deploymentChainConfig) return;
    if (!deployedContract) return;

    const deploymentChainId = deploymentChainConfig.chainId;

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
        const verificationData = {
            contractaddress: deployedContract.address,
            codeformat: 'solidity-standard-json-input',
            sourceCode: JSON.stringify({
                language: 'Solidity',
                sources: {
                    'contract.sol': {
                        content: deployedContract.source
                    },
                    'IProfile.sol': {
                        content: IProfile
                    },
                    'IRegistrationController.sol': {
                        content: IRegistrationController
                    },
                    '@unruggable/gateways/GatewayFetcher.sol': {
                        content: GatewayFetcher
                    },
                    '@unruggable/gateways/GatewayFetchTarget.sol': {
                        content: GatewayFetchTarget
                    },
                    '@unruggable/gateways/IGatewayVerifier.sol': {
                        content: IGatewayVerifier
                    },
                    '@unruggable/gateways/GatewayRequest.sol': {
                        content: GatewayRequest
                    },
                    '@unruggable/gateways/IGatewayProtocol.sol': {
                        content: IGatewayProtocol
                    },
                    'node_modules/@unruggable/gateways/GatewayFetcher.sol': {
                        content: GatewayFetcher
                    },
                    'node_modules/@unruggable/gateways/GatewayFetchTarget.sol': {
                        content: GatewayFetchTarget
                    },
                    'node_modules/@unruggable/gateways/GatewayRequest.sol': {
                        content: GatewayRequest
                    },
                    'node_modules/@unruggable/gateways/IGatewayProtocol.sol': {
                        content: IGatewayProtocol
                    },
                    'node_modules/@unruggable/gateways/IGatewayVerifier.sol': {
                        content: IGatewayVerifier
                    }
                },
                settings: {
                    optimizer: {
                        enabled: deployedContract.optimization,
                        runs: deployedContract.runs
                    },
                    outputSelection: {
                        '*': {
                            '*': ['*']
                        }
                    },
                    remappings: [
                        '@unruggable/gateways/=node_modules/@unruggable/gateways/'
                    ]
                }
            }),
            contractname: `contract.sol:${contractName}`,
            compilerversion: `v${deployedContract.version}+commit.7dd6d404`,
            chainId: deploymentChainId.toString(),
            constructorArguments: deployedContract.encodedArgs.slice(2)
        };

        const submitUrl = new URL(ETHERSCAN_API_URL);
        submitUrl.searchParams.append('apikey', import.meta.env.VITE_ETHERSCAN_API_KEY);
        submitUrl.searchParams.append('module', 'contract');
        submitUrl.searchParams.append('action', 'verifysourcecode');
        submitUrl.searchParams.append('chainid', deploymentChainConfig.chainId.toString());

        const submitResponse = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(verificationData),
        });

        const submitResult = await submitResponse.json();
        
        if (submitResult.status === '1' && submitResult.result) {
            const guid = submitResult.result;
            
            // Check verification status
            const checkVerification = async () => {
                // Construct the URL with query parameters
                const checkUrl = new URL(ETHERSCAN_API_URL);
                checkUrl.searchParams.append('apikey', import.meta.env.VITE_ETHERSCAN_API_KEY);
                checkUrl.searchParams.append('module', 'contract');
                checkUrl.searchParams.append('action', 'checkverifystatus');
                checkUrl.searchParams.append('guid', guid);
                checkUrl.searchParams.append('chainid', deploymentChainConfig.chainId.toString()); // Add chainId parameter

                console.log('Checking verification status at:', checkUrl.toString());

                const checkResponse = await fetch(checkUrl.toString());
                const checkResult = await checkResponse.json();
                console.log('Check verification result:', checkResult);
                
                if (checkResult.result === 'Pending in queue') {
                    // Still pending, wait and check again
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
                    return checkVerification();
                } else if (checkResult.result === 'Pass - Verified') {
                    const successMessage = (<>Contract verified successfully! View it on <a href={`${deploymentChainConfig.etherscanUrl}/address/${deployedContract.address}#code`} target="_blank" rel="noopener noreferrer">Etherscan</a>.</>);
                    setVerificationSuccess(successMessage);
                    return true;
                } else {
                    throw new Error(checkResult.result || 'Verification failed');
                }
            };

            // Start checking verification status
            await checkVerification();
        } else {
            // Handle API key errors specifically
            if (submitResult.result?.includes('Invalid API Key') || submitResult.message?.includes('Invalid API Key')) {
                const errorMessage = `Invalid API key.`
                throw new Error(errorMessage);
            }
            throw new Error(submitResult.result || submitResult.message || 'Verification submission failed');
        }
    } catch (error) {

        console.error('Error verifying contract:', error);
        setVerificationError((error as Error).message);
        setVerificationSuccess(null);

    } finally {
        setIsVerifying(false);
    }
  };

  // Deploy button status and tooltip
  let deployButtonTooltip = null;
  if (!signerAddress){
    deployButtonTooltip = "Please connect your wallet first";
  } else if (deployedContract) {
    deployButtonTooltip = "The contract has been deployed"
  }

  const isDeployDisabled = !signerAddress || isDeploying || !deploymentChainConfig || !compiler || deployedContract != null || isDeployDisabledParent?.();

  // Verify button status and tooltip
  let verifyButtonTooltip = null;
  if (verificationSuccess) {
    verifyButtonTooltip = "The contract has been verified"
  }

  const isVerifyDisabled = deployedContract == null || isVerifying || verificationSuccess != null;

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {deploymentTitle}
        </Typography>

        <Box>
          <Tooltip title={deployButtonTooltip} arrow>
            <span>
              <Button 
                variant="contained" 
                color="primary"
                onClick={deploymentChainConfig?.appkitChain.id !== connectedChainId ? () => switchNetwork
                  (deploymentChainConfig!.appkitChain) : deployContract}
                disabled={isDeployDisabled}
                sx={{ mr: 1 }}
              >
                {isDeploying ? (
                  <CircularProgress size={24} color="inherit" />
                ) : !compiler ? (
                  "Loading compiler..."
                ) : deploymentChainConfig ?
                  (deploymentChainConfig.appkitChain.id !== connectedChainId ?
                    `Switch to ${deploymentChainConfig.name}` :
                    `Deploy to ${deploymentChainConfig.name}`
                  ) : (
                  "Select a chain to deploy"
                )}
              </Button>
            </span>
          </Tooltip>
          {deployedContract && (
            <Tooltip title={verifyButtonTooltip} arrow>
              <span>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={verifyContract}
                  disabled={isVerifyDisabled}
                  >
                  {isVerifying ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "Verify on Etherscan"
                  )}
                </Button>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>
      {compilerError && (
        <ErrorBox>
          {compilerError}
        </ErrorBox>
      )}
      {verificationError && (
        <ErrorBox>
          Verification Error: {verificationError}
        </ErrorBox>
      )}
      {deploymentError && (
        <ErrorBox>
          Deployment Error: {deploymentError}
        </ErrorBox>
      )}
      {deploySuccess && (
        <SuccessBox>
          {deploySuccess}
        </SuccessBox>
      )}
      {verificationSuccess && (
        <SuccessBox>
          {verificationSuccess}
        </SuccessBox>
      )}
      <CodeDisplay>
        {contractSource.split('\n').map((line, i) => {
          // Check if line contains contract-level storage property definition
          if (line.includes('mapping(bytes32 =>')) {
            const slotNumber = (() => {
              if (line.includes('profiles')) return 'Slot 0';
              if (line.includes('nodeProfiles')) return 'Slot 1';
              return '';
            })();
            
            if (slotNumber) {
              return (
                <CodeLine 
                  key={i}
                  line={line}
                  isStorageSlot={true}
                  slotNumber={slotNumber}
                />
              );
            }
          }
          return <CodeLine key={i} line={line} />;
        })}
      </CodeDisplay>
    </Paper>
  );
};

export default ContractDeployment; 