import { 
  BrowserRouter, 
  Link, 
  useLocation 
} from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  Button, 
  Box, 
  Switch, 
  FormControlLabel, 
  Tooltip 
} from '@mui/material';
import { useState } from 'react';
import DeploySubnameSolution from "./pages/DeploySubnameSolution";
import RegisterSubname from "./pages/RegisterSubname";
import { l1Chains } from "./constants";

import { 
	createAppKit,
} 												from '@reown/appkit/react'
import { EthersAdapter } 						from '@reown/appkit-adapter-ethers'
import { 
  mainnet, 
  arbitrum, 
  base, 
  linea, 
  optimism, 
  scroll, 
  sepolia, 
  arbitrumSepolia, 
  baseSepolia, 
  lineaSepolia, 
  optimismSepolia, 
  scrollSepolia, 
} 								    from '@reown/appkit/networks'

//Reown AppKit
const projectId = import.meta.env.VITE_PROJECT_ID

// 3. Create a metadata object
const metadata = {
	name: 'ENS Trustless Cross Chain Subname Solution',
	description: 'Generate and deploy contracts for offering subnames of your ENS names to your users/friends/community.',
	url: 'https://subnames.unruggable.com',
	icons: ['https://subnames.unruggable.com/icons/logo-black.png']
}

createAppKit({
  adapters: [new EthersAdapter()],
  networks: [
    mainnet, 
    arbitrum, 
    base, 
    linea, 
    optimism, 
    scroll,
    sepolia, 
    arbitrumSepolia, 
    baseSepolia, 
    lineaSepolia, 
    optimismSepolia, 
    scrollSepolia
  ],
  metadata,
  projectId,
  features: {
    analytics: true
  },
  themeVariables: {
	//'--w3m-color-mix': '#00BB7F',
	//'--w3m-color-mix-strength': 100,
	//'--w3m-accent': 'white',
	'--w3m-z-index': 9999
	},
	themeMode: 'dark'
})

// Top navigation component for every page
const Navigation = ({ 
  isTestnet,
  setIsTestnet,
  showMore,
  setShowMore
}: { 
  isTestnet: boolean;
  setIsTestnet: (value: boolean) => void;
  showMore: boolean;
  setShowMore: (value: boolean) => void;
}) => {
  const location = useLocation();

  return (
    <AppBar position="sticky" color="default" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            variant={location.pathname === "/" ? "contained" : "text"}
          >
            Deploy Solution
          </Button>
          <Button
            component={Link}
            to="/register"
            color="inherit"
            variant={location.pathname === "/register" ? "contained" : "text"}
          >
            Register Subnames
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={
              <Switch
                checked={isTestnet}
                onChange={(e) => setIsTestnet(e.target.checked)}
                name="testnet"
                color="primary"
              />
            }
            label="Testnet"
          />
          <Tooltip title="Toggle this switch to show more advanced explanations across the application" arrow>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={showMore}
                  onChange={(e) => setShowMore(e.target.checked)}
                  name="showMore"
                />
              }
              label="Tell me more"
            />
          </Tooltip>
          <appkit-button />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

// Content - uses visibility for quick/easy state maintenance
const Content = ({l1ChainConfig, showMore}: {
  l1ChainConfig: any, 
  showMore: boolean
}) => {
  const location = useLocation();
  return (
    <>
      <div style={{ display: location.pathname === '/' ? 'block' : 'none' }}>
          <DeploySubnameSolution 
            key="deploy-subname-solution"
            l1ChainConfig={l1ChainConfig}
            showMore={showMore}
          />
      </div>
      <div style={{ display: location.pathname === '/register' ? 'block' : 'none' }}>
          <RegisterSubname 
            key="register-subname"
            l1ChainConfig={l1ChainConfig}
            showMore={showMore}
          />
      </div>
    </>
  );
};

const Solution = () => {

  // User configurable state
  const [isTestnet, setIsTestnet] = useState(true);
  const [showMore, setShowMore] = useState(false);

  const l1ChainName = isTestnet ? "Sepolia" : "Mainnet";
  const selectedL1ChainConfig = l1Chains.find(c => c.name === l1ChainName)!;
  
  return (
    <BrowserRouter>
      <Navigation 
        isTestnet={isTestnet}
        setIsTestnet={setIsTestnet}
        showMore={showMore}
        setShowMore={setShowMore}
      />
      <Content
        l1ChainConfig={selectedL1ChainConfig}
        showMore={showMore}
      />
    </BrowserRouter>
  );
}

export default Solution;