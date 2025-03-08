import React from 'react';
import { Box, Typography, Grid, Paper, Tooltip, CircularProgress } from '@mui/material';
import { ChainButton, ChainIcon } from '../shared/ChainButton';
import ResolveName from '../shared/ResolveName';
import { l2Chains, l2TestnetChains, ChainConfig } from '../../constants';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import { styles } from '../../styles/Step1L2Storage.styles';
import { styles as common } from '../../styles/common.styles';

interface Step1L2StorageProps {
  l1ChainConfig: ChainConfig;
  selectedChain: string;
  setSelectedChain: (chain: string) => void;
  isTestnet: boolean;
  showMore: boolean;
  deployedL2Address: string | null;
}

const Step1L2Storage: React.FC<Step1L2StorageProps> = ({
  l1ChainConfig,
  selectedChain,
  setSelectedChain,
  isTestnet,
  showMore,
  deployedL2Address
}) => {

  const chains = isTestnet ? l2TestnetChains : l2Chains;
  const selectedChainConfig = chains.find(chain => chain.name === selectedChain);

  const [gatewayConfig, setGatewayConfig] = React.useState<any>(null);
  const [isLoadingGatewayConfig, setIsLoadingGatewayConfig] = React.useState(false);

  const checkGateway = async (gatewayUrl: string) => {

    console.log("check gateway");

    setIsLoadingGatewayConfig(true);
    setGatewayConfig(null);

    try {
      const res = await fetch(gatewayUrl);
      if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
      const data = await res.json();
      setGatewayConfig(data);
      setIsLoadingGatewayConfig(false);

      return data;
    } catch (err) {
      setIsLoadingGatewayConfig(false);
    }
  }

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Select L2 Chain for Profile Storage
      </Typography>
      <Typography variant="body1" sx={{ mb: 1 }}>
        Choose the L2 chain on which you want to store your subname registrations, and associated user profile data.
      </Typography>
      <Box sx={{ mb: 3 }}>
        {showMore && (
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="body2" paragraph>
              This solution stores data on L2 blockchains as they are cheaper to use than L1.
            </Typography>
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
              This solution uses <a href="https://gateway-docs.unruggable.com/" target="_blank" rel="noopener noreferrer">Unruggable Gateways</a> to trustlessly resolve data from the selected L2 chain.
            </Typography>
          </Paper>
        )}
      </Box>
      <Grid container spacing={2}>
        {chains.map((chain) => (
          <Grid item xs={12} sm={6} md={4} key={chain.name}>
            <Tooltip 
              title={
                chain.finalizationInfo?.downReason 
                  ? `${chain.finalizationInfo?.downReason}` 
                  : deployedL2Address 
                    ? "L2 Profile Storage already deployed" 
                    : ""
              }
              arrow
            >
              <span>
                <ChainButton
                  onClick={async () => {
                    if (chain.finalizationInfo?.downReason) { return; }
                    setSelectedChain(chain.name);

                    if (chain.finalizationInfo?.gatewayUrl) {
                      await checkGateway(chain.finalizationInfo.gatewayUrl);
                    }
                  }}
                  className={selectedChain === chain.name ? 'selected' : ''}
                  disabled={!!deployedL2Address || !!chain.finalizationInfo?.downReason}
                  sx={{
                    opacity: (deployedL2Address || chain.finalizationInfo?.downReason) ? 0.6 : 1,
                    cursor: (deployedL2Address || chain.finalizationInfo?.downReason) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChainIcon 
                    src={chain.icon} 
                    alt={chain.name}
                  />
                  <Box sx={styles.chainName}>
                    <Typography variant="subtitle1">
                      {chain.name}
                    </Typography>
                    {chain.finalizationInfo?.downReason && (
                      <WarningIcon sx={styles.warningIcon} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Chain ID: {chain.chainId}
                  </Typography>
                </ChainButton>
              </span>
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      {selectedChainConfig?.finalizationInfo && !deployedL2Address && (
        <>
          <Paper 
            variant="outlined" 
            sx={styles.infoBox}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <InfoIcon sx={styles.infoIcon} />
              <Box>
                <Typography 
                  variant="subtitle1" 
                  gutterBottom 
                  sx={styles.title}
                >
                  {selectedChainConfig.finalizationInfo.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  paragraph
                  sx={styles.description}
                >
                  {selectedChainConfig.finalizationInfo.description}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={styles.finalizationTime}
                >
                  <div style={styles.infoRow}>
                    <span style={styles.infoItem}>Gateway:</span>
                    <span style={styles.timeValue}>
                      <a 
                        href={`${selectedChainConfig.finalizationInfo.gatewayUrl}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={common.blueLink}
                      >
                        {selectedChainConfig.finalizationInfo.gatewayUrl}
                      </a>

                      {!isLoadingGatewayConfig ? (
                        <>
                          {gatewayConfig != null && (
                            
                              <textarea 
                                style={{
                                  width: '100%',
                                  height: '200px',
                                  color: 'black',
                                  fontSize: '12px',
                                  marginTop: '10px'
                                }}
                                value={JSON.stringify(gatewayConfig, null, 2)}
                                readOnly />
                            
                          )}
                        </>
                      ) : (
                        <div style={{marginTop: '10px'}}>
                          <CircularProgress size={16} />
                        </div>
                      )}
                    </span>   
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoItem}>Verifier:</span>
                    <span style={styles.timeValue}>
                      <ResolveName key={`${selectedChainConfig.chainId}-resolve`} name={selectedChainConfig.verifierEns} network={isTestnet?"sepolia" : "mainnet"}/>
                    </span>
                  </div>

                  <div style={styles.infoRow}>

                    <span style={styles.infoItem}>Proof System:</span> 
                    <span style={styles.timeValue}>
                      {selectedChainConfig.finalizationInfo.proofSystem}
                    </span>
                  </div>
                  <div style={styles.infoRow}>

                    <span style={styles.infoItem}>Posting Schedule:</span>
                    <span style={styles.timeValue}>
                      <a 
                        href={`${l1ChainConfig.etherscanUrl}/address/${selectedChainConfig.finalizationInfo.relevantL1Contract}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={common.blueLink}
                      >
                        {selectedChainConfig.finalizationInfo.postingSchedule}
                      </a>
                    </span>
                  </div>
                  <div style={styles.infoRow}>
                    <span style={styles.infoItem}>Wait Time:</span>
                    <span style={styles.timeValue}>
                      {selectedChainConfig.finalizationInfo.time}
                    </span>
                  </div>
                </Typography>
              </Box>
            </Box>
          </Paper>

          {selectedChainConfig.finalizationInfo.downReason && (
            <Paper 
              variant="outlined" 
              sx={styles.errorBox}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <WarningIcon sx={styles.errorText} />
                <Typography 
                  variant="body1" 
                  sx={{ 
                    ...styles.errorText,
                    fontWeight: 600
                  }}
                >
                  Chain Currently Unavailable
                </Typography>
              </Box>
              <Typography 
                variant="body2" 
                sx={{ 
                  ...styles.errorText,
                  mt: 1
                }}
              >
                {selectedChainConfig.finalizationInfo.downReason}
              </Typography>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
};

export default Step1L2Storage; 