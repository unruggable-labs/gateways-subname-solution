import { Box, Typography, styled } from '@mui/material';

const StyledBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: '#ffebee',  // or theme.palette.error.light
  borderRadius: theme.shape.borderRadius,
}));

// Optional: If you want to add TypeScript props interface
interface ErrorBoxProps {
  children: React.ReactNode;
  // Optional: Add more props if needed
  className?: string;
}

export const ErrorBox = ({ children, ...props }: ErrorBoxProps) => (
  <StyledBox {...props}>
    <Typography color="error" variant="subtitle2">
      {children}
    </Typography>
  </StyledBox>
); 