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
import { encodeContentHash, decodeContentHash,getDisplayCodec } from '@ensdomains/ensjs/utils';

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

// Contenthash conversion functions
const textToContenthash = (text: string): string => {
  if (!text) return '0x';
  try {
    const encoded = encodeContentHash(text);
    return encoded;
  } catch (e) {
    console.error('Error encoding content hash:', e);
    return '0x';
  }
};

const contenthashToText = (bytes: `0x${string}`): string => {
  if (!bytes || bytes === '0x') return '';
  try {
    const decodedContentHash = decodeContentHash(bytes);
    if (decodedContentHash !== null) {
      return `${decodedContentHash.protocolType}://${decodedContentHash.decoded}`;
    }
  } catch (e) {
    console.error('Error decoding content hash:', e);
  }
  return '';
};

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
  const [contenthash, setContenthash] = useState<string>('');
  const [contractVersion, setContractVersion] = useState<number>(0);

  // Track loaded data for comparison
  const [loadedTextRecords, setLoadedTextRecords] = useState<TextRecord[]>([]);
  const [loadedAddresses, setLoadedAddresses] = useState<AddressRecord[]>([]);
  const [loadedContenthash, setLoadedContenthash] = useState<string>('');

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

  // State for edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [hasProfileChanges, setHasProfileChanges] = useState(false);

  // State for profile save success
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  // Check if profile has changes
  const checkProfileChanges = () => {
    if (!isProfileLoaded) return false;
    
    // Check text records
    const textRecordsChanged = textRecords.some((record, index) => {
      const originalRecord = loadedTextRecords[index];
      return !originalRecord || 
             record.key !== originalRecord.key || 
             record.value !== originalRecord.value;
    });

    // Check addresses
    const addressesChanged = addresses.some((record, index) => {
      const originalRecord = loadedAddresses[index];
      return !originalRecord || 
             record.coinType !== originalRecord.coinType || 
             record.address !== originalRecord.address;
    });

    // Check contenthash
    const contenthashChanged = contenthash !== loadedContenthash;

    return textRecordsChanged || addressesChanged || contenthashChanged;
  };

  // Handler function to update profile
  const updateProfile = async () => {
    if (!signerAddress || !profileIdentifier || !deployedL2Address || !deployedL2ChainConfig) return;
    
    setIsUpdatingProfile(true);
    setProfileError(null);
    setProfileSaveSuccess(null);

    try {
      await switchNetwork(deployedL2ChainConfig);
      const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
      const newSigner = await provider.getSigner();

      const l2Contract = new Contract(deployedL2Address, [
        'function generateProfileId(string memory name) external pure returns (bytes32)',
        'function updateProfileData(bytes32 profileId, string[] calldata textKeys, string[] calldata textValues, uint256[] calldata coinTypes, bytes[] calldata addrs, bytes calldata contenthash) external payable'
      ], newSigner);

      const profileId = await l2Contract.generateProfileId(profileIdentifier);

      const textKeys = textRecords.map(record => record.key);
      const textValues = textRecords.map(record => record.value);
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

      const tx = await l2Contract.updateProfileData(
        profileId,
        textKeys,
        textValues,
        coinTypes,
        decodedAddrs,
        textToContenthash(contenthash),
        { gasLimit: 1000000 }
      );
      await tx.wait();

      // Update loaded data
      setLoadedTextRecords([...textRecords]);
      setLoadedAddresses([...addresses]);
      setLoadedContenthash(contenthash);
      setIsEditMode(false);
      setHasProfileChanges(false);
      setProfileSaveSuccess('Profile saved successfully!');

    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileError((error as Error).message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSubnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSubname(e.target.value.toLowerCase());
    setProfileSaveSuccess(null);
  };

  const registerSubname = async () => {
    if (!signerAddress || !debouncedSubname || !ensName || !deployedL2Address || !deployedL2ChainConfig) return;
    
    setIsRegisteringSubname(true);
    setSubnameError(null);
    setSubnameSuccess(null);
    setProfileSaveSuccess(null);

    try {
      await switchNetwork(deployedL2ChainConfig);
      const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
      const newSigner = await provider.getSigner();

      const fullName = `${debouncedSubname}.${ensName}`;
      const node = namehash(fullName);

      const l2Contract = new Contract(deployedL2Address, [
        'function generateProfileId(string memory name) external pure returns (bytes32)',
        'function register(bytes32 node, bytes32 profileId) external payable'
      ], newSigner);

      const profileId = await l2Contract.generateProfileId(profileIdentifier || 'default');

      // Register the subname
      const tx = await l2Contract.register(
        node,
        profileId,
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

  // useEffect to check for profile changes
  useEffect(() => {
    if (isProfileLoaded) {
      setHasProfileChanges(checkProfileChanges());
    }
  }, [textRecords, addresses, contenthash, isProfileLoaded]);

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

      try {
        // Make sure we are on the right network
        await switchNetwork(deployedL2ChainConfig);
        const provider = new BrowserProvider(walletProvider, deployedL2ChainConfig.id);
        const newSigner = await provider.getSigner();

        // Get contract version
        const versionSlot = '0xa813a7c08b609c7cefba2b595bd042a9c1c1692d4d92728d902b4785c6d4d8c2';
        const version = await provider.getStorage(deployedL2Address, versionSlot);
        setContractVersion(Number(version));

        const l2Contract = new Contract(deployedL2Address, [
          'function generateProfileId(string memory name) external pure returns (bytes32)',
          'function getProfile(bytes32 profileId) external view returns (address, string[] memory, string[] memory, uint256[] memory, bytes[] memory, bytes memory)'
        ], newSigner);

        const profileId = await l2Contract.generateProfileId(debouncedProfileIdentifier);
        const [owner, textKeys, textValues, coinTypes, addresses, contenthash] = await l2Contract.getProfile(profileId);
        const connectedAddress = await newSigner.getAddress();

        // Convert text records
        const loadedTextRecords = textKeys.map((key: string, index: number) => ({
          key,
          value: textValues[index]
        }));
        setTextRecords(loadedTextRecords);
        setLoadedTextRecords(loadedTextRecords);

        // Set content hash if version supports it
        if (Number(version) >= 1) {
          const decodedContentHash = contenthashToText(contenthash);
          setContenthash(decodedContentHash);
          setLoadedContenthash(decodedContentHash);
        }

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
        setLoadedAddresses(loadedAddresses);

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
    : isEditMode
    ? "Please save or cancel profile changes before registering"
    : null;

  const isRegisterSubnameDisabled = Boolean(
    !deployedL2Address ||
    !subname ||
    !subnameAvailable ||
    isRegisteringSubname ||
    isEditMode
  );

  // Reset the form to register another subname
  const resetForm = () => {
    setSubname('');
    setProfileIdentifier('');
    setShowAdvancedSetup(false);
    setTextRecords([]);
    setAddresses([]);
    setContenthash('');
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
              onChange={handleSubnameChange}
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
                          {isProfileLoaded && (
                            <>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="subtitle1">Profile Data</Typography>
                                {!isEditMode ? (
                                  <Button
                                    variant="outlined"
                                    onClick={() => setIsEditMode(true)}
                                    disabled={isRegisteringSubname || isUpdatingProfile}
                                  >
                                    Edit Profile
                                  </Button>
                                ) : (
                                  <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Button
                                      variant="outlined"
                                      color="error"
                                      onClick={() => {
                                        setIsEditMode(false);
                                        setTextRecords([...loadedTextRecords]);
                                        setAddresses([...loadedAddresses]);
                                        setContenthash(loadedContenthash);
                                      }}
                                      disabled={isRegisteringSubname || isUpdatingProfile}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="contained"
                                      onClick={updateProfile}
                                      disabled={!hasProfileChanges || isRegisteringSubname || isUpdatingProfile}
                                    >
                                      {isUpdatingProfile ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                          <CircularProgress size={20} color="inherit" />
                                          Updating...
                                        </Box>
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </Button>
                                  </Box>
                                )}
                              </Box>

                              {profileSaveSuccess && (
                                <Box sx={{ mb: 2 }}>
                                  <SuccessBox>
                                    {profileSaveSuccess}
                                  </SuccessBox>
                                </Box>
                              )}

                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>Text Records</Typography>
                                <Box sx={{ 
                                  opacity: isEditMode ? 1 : 0.7,
                                  cursor: isEditMode ? 'default' : 'not-allowed',
                                  pointerEvents: isEditMode ? 'auto' : 'none'
                                }}>
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
                                        disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
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
                                        disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
                                      />
                                      {isEditMode && (
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          onClick={() => {
                                            setTextRecords(textRecords.filter((_, i) => i !== index));
                                          }}
                                          disabled={isRegisteringSubname || isUpdatingProfile}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                                <Button 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    setTextRecords([...textRecords, { key: '', value: '' }]);
                                  }}
                                  sx={{ mt: 1 }}
                                  disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
                                >
                                  Add Text Record
                                </Button>
                              </Box>

                              <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>Addresses</Typography>
                                <Box sx={{ 
                                  opacity: isEditMode ? 1 : 0.7,
                                  cursor: isEditMode ? 'default' : 'not-allowed',
                                  pointerEvents: isEditMode ? 'auto' : 'none'
                                }}>
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
                                          disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
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
                                        disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
                                      />
                                      {isEditMode && (
                                        <Button
                                          variant="outlined"
                                          color="error"
                                          onClick={() => {
                                            setAddresses(addresses.filter((_, i) => i !== index));
                                          }}
                                          disabled={isRegisteringSubname || isUpdatingProfile}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </Box>
                                  ))}
                                </Box>
                                <Button 
                                  variant="outlined" 
                                  color="primary"
                                  onClick={() => {
                                    // Find the first available coin type
                                    const usedCoinTypes = addresses.map(addr => Number(addr.coinType));
                                    const nextAvailableCoin = COIN_TYPES.find(coin => !usedCoinTypes.includes(coin.value));
                                    if (nextAvailableCoin) {
                                      setAddresses([...addresses, { coinType: nextAvailableCoin.value, address: '' }]);
                                    }
                                  }}
                                  disabled={!isEditMode || addresses.length >= COIN_TYPES.length || isRegisteringSubname || isUpdatingProfile}
                                  sx={{ mt: 1 }}
                                >
                                  Add Address
                                </Button>
                              </Box>

                              {contractVersion >= 1 && (
                                <Box sx={{ mb: 3 }}>
                                  <Typography variant="subtitle1" gutterBottom>Content Hash</Typography>
                                  <Box sx={{ 
                                    opacity: isEditMode ? 1 : 0.7,
                                    cursor: isEditMode ? 'default' : 'not-allowed',
                                    pointerEvents: isEditMode ? 'auto' : 'none'
                                  }}>
                                    <TextField
                                      label="Content Hash"
                                      value={contenthash}
                                      onChange={(e) => setContenthash(e.target.value)}
                                      placeholder="ipfs://..."
                                      fullWidth
                                      disabled={!isEditMode || isRegisteringSubname || isUpdatingProfile}
                                      sx={{ mb: 2 }}
                                    />
                                  </Box>
                                </Box>
                              )}
                            </>
                          )}
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