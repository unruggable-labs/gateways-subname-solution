
export const styles = {
  // Text styles
  successText: {
    color: '#1b5e20',
    fontWeight: 500,
    '& a': {
      textDecoration: 'underline',
      '&:hover': {
        textDecoration: 'none'
      }
    }
  }, 
  loader: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'block',
    margin:'8px auto',
    position: 'relative',
    background: 'black',
    boxShadow: '-24px 0 black, 24px 0 #FFF',
    boxSizing: 'border-box',
    animation: 'shadowPulse 2s linear infinite',
  },
  normalLink: {
    textDecoration: 'none',
    color: 'black',
    fontWeight: 500
  },
  blueLink: {
    color: '#1565c0'
  }
};