import { SxProps, Theme } from '@mui/material';

export const styles = {
  infoBox: {
    mt: 3,
    p: 2,
    bgcolor: '#e3f2fd',
    borderColor: '#90caf9'
  },
  infoIcon: {
    color: '#1565c0',
    mt: 0.5
  },
  title: {
    color: '#1565c0',
    fontWeight: 600
  },
  description: {
    color: '#1a237e',
    lineHeight: 1.6
  },
  finalizationTime: {
    color: '#1a237e',
    display: 'flex',
    flexDirection: 'column',
    gap: 1
  },
  bulletPoint: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#1565c0'
  },
  infoRow: {
    display: 'flex',
    marginBottom: '4px',
    alignItems: 'baseline',
  },
  timeValue: {
    fontWeight: 600,
    marginLeft: 5,
    '& a': {
      color: '#1a237e',
      textDecoration: 'underline',
      '&:hover': {
        textDecoration: 'none'
      }
    }
  },
  infoItem: {
    width: '120px'
  },
  chainName: {
    display: 'flex',
    alignItems: 'center',
    gap: 1
  },
  warningIcon: {
    color: 'error.main',
    fontSize: '1.2rem'
  },
  errorBox: {
    mt: 2,
    p: 2,
    bgcolor: 'error.light',
    borderColor: 'error.main'
  },
  errorText: {
    color: 'error.contrastText'
  },
} as const; 