import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

interface Step2L1ResolverProps {
  isTestnet: boolean;
  showMore: boolean;
}

const Step2L1Resolver: React.FC<Step2L1ResolverProps> = ({
  isTestnet,
  showMore
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        L1 ENS Resolver Contract
      </Typography>
      <Typography variant="body1" sx={{ mb: 2, '& a': {
        color: '#1565c0',
        textDecoration: 'underline',
        fontWeight: 500,
        '&:hover': {
          textDecoration: 'none'
        }
      } }}>
        A <strong>resolver</strong> contract has been generated based on your selection. Click the button below to deploy it to {isTestnet ? 'Sepolia' : 'Mainnet'}.
      </Typography>

      {showMore && (
        <Paper variant="outlined" sx={{ mt: 2, mb: 2, p: 2 }}>
          <Typography variant="body2" sx={{
            mb: 2,
            '& a': {
              color: '#1565c0',
              textDecoration: 'underline',
              fontWeight: 500,
              '&:hover': {
                textDecoration: 'none'
              }
            }
          }}>
            The resolver contract below uses <a href="https://docs.ens.domains/ensip/10" target="_blank" rel="noopener noreferrer">ENSIP-10: Wildcard Resolution</a>.
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
            A request built with the Unruggable Gateways builder interface triggers a <a href="https://eips.ethereum.org/EIPS/eip-3668" target="_blank" rel="noopener noreferrer">ERC 3668: CCIP Read</a> offchain lookup to trustlessly resolve data associated with the subname. 
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default Step2L1Resolver; 