import { Box, Typography, styled } from '@mui/material';

const StyledBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: '#e8f5e9',
  borderRadius: theme.shape.borderRadius,
  border: '1px solid #81c784',
}));

interface SuccessBoxProps {
  children: React.ReactNode;
  className?: string;
}

export const SuccessBox = ({ children, ...props }: SuccessBoxProps) => (
  <StyledBox {...props}>
    <Typography 
      variant="subtitle2" 
      sx={{ 
        color: '#1b5e20',
        fontWeight: 500,
        '& a': {
          color: 'inherit',
          textDecoration: 'underline',
          '&:hover': {
            textDecoration: 'none'
          }
        }
      }}
    >
      {children}
    </Typography>
  </StyledBox>
); 