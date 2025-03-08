import { Button, styled } from '@mui/material';

export const ChainButton = styled(Button)(({ theme }) => ({
  width: '100%',
  height: '120px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(2),
  border: '1px solid',
  borderColor: theme.palette.divider,
  borderRadius: theme.shape.borderRadius,
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: 'rgba(25, 118, 210, 0.04)'
  },
  '&.selected': {
    borderColor: theme.palette.primary.main,
    backgroundColor: 'rgba(25, 118, 210, 0.08)'
  }
}));

export const ChainIcon = styled('img')({
  width: '40px',
  height: '40px',
  objectFit: 'contain'
}); 