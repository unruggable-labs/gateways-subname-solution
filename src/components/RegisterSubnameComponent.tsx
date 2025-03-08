import React, { useEffect, useState } from 'react';
import { getCoderByCoinType } from "@ensdomains/address-encoder";
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  CircularProgress, 
  Tooltip, 
  FormControlLabel, 
  Switch, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel 
} from '@mui/material';
import { 
  BrowserProvider, 
  Contract, 
  Eip1193Provider, 
  getBytes, 
  namehash 
} from 'ethers';
import { useDebounce } from '../hooks/useDebounce';
import { ErrorBox } from './shared/ErrorBox';
import { SuccessBox } from './shared/SuccessBox';
import { unpadBytes } from '../utils/utils';
import { getExpectedDecodedLength } from '../utils/utils';

import { 
  useAppKitAccount,
	useAppKitNetwork,
  useAppKitProvider 
} from '@reown/appkit/react'
import { AppKitNetwork } from '@reown/appkit/networks';

interface Step4RegisterSubnameProps {
  ensName: string | null;
  deployedL2Address: string | null;
  deployedL2ChainConfig: AppKitNetwork | null;
}

// Coin types for profile selector
const COIN_TYPES = [
  { value: 60, label: 'ETHEREUM' },
  { value: 2147483658, label: 'OPTIMISM' },
  { value: 2147525809, label: 'ARBITRUM' },
  { value: 2147492101, label: 'BASE' },
  { value: 2147542792, label: 'LINEA' },
  { value: 2148018000, label: 'SCROLL' },
  { value: 0, label: 'BITCOIN' }
];

interface TextRecord {
  key: string;
  value: string;
}

interface AddressRecord {
  coinType: number;
  address: string;
}

const RegisterSubnameComponent: React.FC<Step4RegisterSubnameProps> = ({
  ensName,
  deployedL2Address,
  deployedL2ChainConfig,
}) => {

  // Subname lookup state
  const [subname, setSubname] = useState<string>('');
  const [isCheckingSubname, setIsCheckingSubname] = useState(false);
  const [subnameAvailable, setSubnameAvailable] = useState<boolean | null>(null);

  // Toggle to show advanced setup - profile setup
  const [showAdvancedSetup, setShowAdvancedSetup] = useState(false);

  // Profile lookup state
  const [profileIdentifier, setProfileIdentifier] = useState<string>('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Subname registration state
  const [isRegisteringSubname, setIsRegisteringSubname] = useState(false);
  const [subnameError, setSubnameError] = useState<string | null>(null);
  const [subnameSuccess, setSubnameSuccess] = useState<any | null>(null);

  // Current loaded profile data
  const [textRecords, setTextRecords] = useState<TextRecord[]>([]);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);

  // Debounced inputs
  const debouncedSubname = useDebounce(subname, 1000);
  const debouncedProfileIdentifier = useDebounce(profileIdentifier, 1000);

  const { switchNetwork } = useAppKitNetwork()
  const { walletProvider } = useAppKitProvider('eip155') as { walletProvider: Eip1193Provider };
	const { 
		address: signerAddress, 
		isConnected,
		...rest 
	} 													= useAppKitAccount()


  // Check subname availability once debounced
  useEffect(() => {
    if (debouncedSubname) { 
      checkSubnameAvailability(); 
    }
  }, [debouncedSubname]);

  // Load profile data when debounced profile identifier changes
  useEffect(() => {
    const loadProfileData = async () => {
      if (!debouncedProfileIdentifier || !deployedL2Address || !deployedL2ChainConfig) return;

      setIsLoadingProfile(true);
      setProfileError(null);
      setIsProfileLoaded(false);

      // Make sure we are on the right network
      await switchNetwork(deployedL2ChainConfig);
      const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
      const newSigner = await provider.getSigner();

      try {

        const l2Contract = new Contract(deployedL2Address, [
          'function generateProfileId(string memory name) external pure returns (bytes32)',
          'function getProfile(bytes32 profileId) external view returns (address, string[] memory, string[] memory, uint256[] memory, bytes[] memory)'
        ], newSigner);

        const profileId = await l2Contract.generateProfileId(debouncedProfileIdentifier);
        const [owner, textKeys, textValues, coinTypes, addresses] = await l2Contract.getProfile(profileId);
        const connectedAddress = await newSigner.getAddress();

        // Convert text records
        const loadedTextRecords = textKeys.map((key: string, index: number) => ({
          key,
          value: textValues[index]
        }));
        setTextRecords(loadedTextRecords);

        // Convert and encode address records
        const loadedAddresses = await Promise.all(
          coinTypes.map(async (coinType: number, index: number) => {
            const coder = getCoderByCoinType(Number(coinType));
            const raw = getBytes(addresses[index]);
            const expectedLength = getExpectedDecodedLength(coinType);
            const unpadded = unpadBytes(raw, expectedLength);
            const encodedAddress = coder ? await coder.encode(unpadded) : '';
            return {
              coinType,
              address: encodedAddress
            };
          })
        );
        setAddresses(loadedAddresses);

        setIsProfileLoaded(true);

        // Check if profile has any records and if owner matches
        if ((loadedTextRecords.length > 0 || loadedAddresses.length > 0) && 
            owner.toLowerCase() !== connectedAddress.toLowerCase()) {
          setProfileError(`Warning: This profile is owned by ${owner.slice(0, 6)}...${owner.slice(-4)}. You are connected with ${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}. You may not be able to modify this profile.`);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        setProfileError((error as Error).message);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    loadProfileData();
  }, [debouncedProfileIdentifier]);

  // Handler to do the actual subname registration
  const registerSubname = async () => {
    if (!signerAddress || !debouncedSubname || !ensName || !deployedL2Address || !deployedL2ChainConfig) return;
    
    setIsRegisteringSubname(true);
    setSubnameError(null);
    setSubnameSuccess(null);

    try {

      // Make sure we are on the right network
      await switchNetwork(deployedL2ChainConfig);
      const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
      const newSigner = await provider.getSigner();

      const fullName = `${debouncedSubname}.${ensName}`;
      const node = namehash(fullName);

      const l2Contract = new Contract(deployedL2Address, [
        'function register(bytes32 node, bytes32 profileId, string[] calldata textKeys, string[] calldata textValues, uint256[] calldata coinTypes, bytes[] calldata addrs) external payable',
        'function generateProfileId(string memory name) external pure returns (bytes32)'
      ], newSigner);

      const profileId = await l2Contract.generateProfileId(profileIdentifier || 'default');

      const textKeys = textRecords.map(record => record.key);
      const textValues = textRecords.map(record => record.value);

      // Decode address records
      const coinTypes = addresses.map(record => record.coinType);
      const decodedAddrs = await Promise.all(
        addresses.map(async record => {
          const coder = getCoderByCoinType(Number(record.coinType));
          const decoded = coder ? await coder.decode(record.address) : [];
          const padded = new Uint8Array(32);
          padded.set(decoded, 32 - decoded.length);
          return padded;
        })
      );

      // Register the subname with all records
      const tx = await l2Contract.register(
        node,
        profileId,
        textKeys,
        textValues,
        coinTypes,
        decodedAddrs,
        { gasLimit: 1000000 }
      );
      await tx.wait();

      setSubnameSuccess((
        <>
          Successfully registered <strong>{fullName}</strong>!
        </>
      ));

    } catch (error) {
      console.error('Error registering subname:', error);
      setSubnameError((error as Error).message);
    } finally {
      setIsRegisteringSubname(false);
    }
  };

  // Handler to check subname availability
  const checkSubnameAvailability = async () => {
    if (!debouncedSubname || !ensName || !deployedL2Address || !deployedL2ChainConfig) return;

    setIsCheckingSubname(true);
    setSubnameAvailable(null);
    setSubnameError(null);

    try {

      // Make sure we are on the right network
      await switchNetwork(deployedL2ChainConfig);
      const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
      const newSigner = await provider.getSigner();

      const node = namehash(`${debouncedSubname}.${ensName}`);
      const l2Contract = new Contract(deployedL2Address, [
        'function isNameAvailable(bytes32 node) view returns (bool)'
      ], newSigner);

      const isAvailable = await l2Contract.isNameAvailable(node);
      setSubnameAvailable(isAvailable);

      if (!isAvailable) {
        setSubnameError(`The subname ${debouncedSubname}.${ensName} is already taken`);
      }
    } catch (error) {
      console.error('Error checking subname availability:', error);
      setSubnameError('Error checking subname availability');
      setSubnameAvailable(null);
    } finally {
      setIsCheckingSubname(false);
    }
  };

  const tooltipMessage = !deployedL2Address
    ? "Invalid data contract"
    : !ensName
    ? "Please enter an ENS name"
    : !subname
    ? "Please enter a subname"
    : !subnameAvailable
    ? "This subname is not available"
    : null;

  const isRegisterSubnameDisabled = Boolean(
    !deployedL2Address ||
    !subname ||
    !subnameAvailable ||
    isRegisteringSubname
  );

  // Reset the form to register another subname
  const resetForm = () => {
    setSubname('');
    setProfileIdentifier('');
    setShowAdvancedSetup(false);
    setTextRecords([]);
    setAddresses([]);
    setSubnameSuccess(null);
    setSubnameError(null);
    setIsProfileLoaded(false);
    setSubnameAvailable(null);
  };

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Register Subname
      </Typography>

      {!subnameSuccess ? (
        <>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
            <TextField
              label="Subname"
              value={subname}
              onChange={(e) => setSubname(e.target.value.toLowerCase())}
              placeholder="mysubname"
              sx={{ flexGrow: 1 }}
              disabled={isRegisteringSubname}
            />
            <Typography variant="body1" sx={{ mt: 2 }}>
              .{ensName || 'yournamehere.eth'}
            </Typography>
          </Box>
          {isCheckingSubname ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #81c784' }}>
              <CircularProgress size={20} />
              <Typography sx={{ color: '#1b5e20' }} variant="body2">
                Checking availability of {debouncedSubname}.{ensName}...
              </Typography>
            </Box>
          ) : subnameAvailable === true ? (
            <SuccessBox>
              ✓ {debouncedSubname}.{ensName} is available!
            </SuccessBox>
          ) : subnameError && (
            <ErrorBox>
              ✕ {subnameError}
            </ErrorBox>
          )}

          {subnameAvailable && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    checked={showAdvancedSetup}
                    onChange={(e) => setShowAdvancedSetup(e.target.checked)}
                    size="small"
                  />
                }
                label="Advanced: Profile Setup"
                sx={{ mb: 2 }}
              />
              {showAdvancedSetup && (
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                    <TextField
                      label="Profile Identifier"
                      value={profileIdentifier}
                      onChange={(e) => setProfileIdentifier(e.target.value)}
                      placeholder="my-profile-identifier"
                      sx={{ flexGrow: 1 }}
                    />
                  </Box>

                  {profileIdentifier && (
                    <>
                      {isLoadingProfile ? (
                        <Box sx={{ mb: 2, p: 2, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #fdd835' }}>
                          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#5d4037' }}>
                            <CircularProgress size={16} sx={{ color: '#5d4037' }} />
                            Loading profile...
                          </Typography>
                        </Box>
                      ) : profileError ? (
                        <ErrorBox>
                          {profileError}
                        </ErrorBox>
                      ) : (
                        <>
                          {!isProfileLoaded && (
                            <Box sx={{ mb: 2, p: 2, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #fdd835' }}>
                              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#5d4037' }}>
                                <CircularProgress size={16} sx={{ color: '#5d4037' }} />
                                Loading profile...
                              </Typography>
                            </Box>
                          )}
                          {isProfileLoaded && textRecords.length === 0 && addresses.length === 0 && (
                            <Box sx={{ mb: 2, p: 2, bgcolor: '#fff9c4', borderRadius: 1, border: '1px solid #fdd835' }}>
                              <Typography variant="subtitle2" sx={{ color: '#5d4037' }}>
                                This is a new profile. Add text records and addresses below.
                              </Typography>
                            </Box>
                          )}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>Text Records</Typography>
                            {textRecords.map((record, index) => (
                              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                <TextField
                                  label="Key"
                                  value={record.key}
                                  onChange={(e) => {
                                    const updatedRecords = [...textRecords];
                                    updatedRecords[index] = { ...record, key: e.target.value };
                                    setTextRecords(updatedRecords);
                                  }}
                                  sx={{ flex: 1 }}
                                  disabled={isRegisteringSubname}
                                />
                                <TextField
                                  label="Value"
                                  value={record.value}
                                  onChange={(e) => {
                                    const updatedRecords = [...textRecords];
                                    updatedRecords[index] = { ...record, value: e.target.value };
                                    setTextRecords(updatedRecords);
                                  }}
                                  sx={{ flex: 1 }}
                                  disabled={isRegisteringSubname}
                                />
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setTextRecords(textRecords.filter((_, i) => i !== index));
                                  }}
                                  disabled={isRegisteringSubname}
                                >
                                  Remove
                                </Button>
                              </Box>
                            ))}
                            <Button 
                              variant="outlined" 
                              color="primary"
                              onClick={() => {
                                setTextRecords([...textRecords, { key: '', value: '' }]);
                              }}
                              sx={{ mt: 1 }}
                              disabled={isRegisteringSubname}
                            >
                              Add Text Record
                            </Button>
                          </Box>

                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>Addresses</Typography>
                            {addresses.map((record, index) => (
                              <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
                                <FormControl sx={{ minWidth: 120 }}>
                                  <InputLabel>Coin Type</InputLabel>
                                  <Select
                                    value={record.coinType.toString()}
                                    label="Coin Type"
                                    onChange={(e) => {
                                      const newCoinType = parseInt(e.target.value);
                                      const updatedAddresses = [...addresses];
                                      updatedAddresses[index] = { ...record, coinType: newCoinType };
                                      setAddresses(updatedAddresses);
                                    }}
                                    disabled={isRegisteringSubname}
                                  >
                                    {(() => {
                                      const availableCoins = COIN_TYPES.filter(coin => {
                                        // Always show the current record's coin type
                                        if (coin.value === record.coinType) return true;
                                        
                                        // For other records, check if this coin type is already used
                                        const isUsedElsewhere = addresses.some((addr, idx) => 
                                          addr.coinType === coin.value && idx !== index
                                        );
                                        return !isUsedElsewhere;
                                      });
                                      return availableCoins.map((coin) => (
                                        <MenuItem key={coin.value} value={coin.value.toString()}>
                                          {coin.label}
                                        </MenuItem>
                                      ));
                                    })()}
                                  </Select>
                                </FormControl>
                                <TextField
                                  label="Address"
                                  value={record.address}
                                  onChange={async (e) => {
                                    const updatedAddresses = [...addresses];
                                    updatedAddresses[index] = { ...record, address: e.target.value };

                                    setAddresses(updatedAddresses);
                                  }}
                                  sx={{ flex: 1 }}
                                  disabled={isRegisteringSubname}
                                />
                                <Button
                                  variant="outlined"
                                  color="error"
                                  onClick={() => {
                                    setAddresses(addresses.filter((_, i) => i !== index));
                                  }}
                                  disabled={isRegisteringSubname}
                                >
                                  Remove
                                </Button>
                              </Box>
                            ))}
                            <Button 
                              variant="outlined" 
                              color="primary"
                              onClick={() => {
                                // Find the first available coin type
                                const usedCoinTypes = addresses.map(addr => Number(addr.coinType));
                                const nextAvailableCoin = COIN_TYPES.find(coin => !usedCoinTypes.includes(coin.value));
                                if (nextAvailableCoin) {
                                  const newAddress = { coinType: nextAvailableCoin.value, address: '' };
                                  setAddresses(currentAddresses => {
                                    const updatedAddresses = [...currentAddresses];
                                    updatedAddresses.push(newAddress);
                                    return updatedAddresses;
                                  });
                                }
                              }}
                              disabled={addresses.length >= COIN_TYPES.length || isRegisteringSubname}
                              sx={{ mt: 1 }}
                            >
                              Add Address
                            </Button>
                          </Box>
                        </>
                      )}
                    </>
                  )}
                </Box>
              )}
            </>
          )}

          <Box sx={{ mt: 3 }}>
            {(() => {
              const button = (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={isRegisterSubnameDisabled}
                  onClick={registerSubname}
                  fullWidth
                >
                  {isRegisteringSubname ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={20} color="inherit" />
                      Registering...
                    </Box>
                  ) : (
                    'Register Subname'
                  )}
                </Button>
              );

              return tooltipMessage ? (
                <Tooltip title={tooltipMessage} arrow>
                  <span style={{ display: 'inline-block', width: '100%' }}>{button}</span>
                </Tooltip>
              ) : button;
            })()}
          </Box>

        </>
      ) : (

        <>
          <SuccessBox>
            ✓ {subnameSuccess}
          </SuccessBox>
          <Button
            variant="contained"
            color="primary"
            onClick={resetForm}
            fullWidth
          >
            Register Another
          </Button>
        </>
      )}
    </Box>
  );
};

export default RegisterSubnameComponent; 