import { 
  AppKitNetwork, 
  arbitrum, 
  arbitrumSepolia, 
  base,
  baseSepolia, 
  linea, 
  lineaSepolia, 
  mainnet, 
  optimism, 
  optimismSepolia, 
  scroll, 
  scrollSepolia, 
  sepolia 
} from "@reown/appkit/networks";

// ENS Registry ABI - only the functions we need
export const ENS_REGISTRY_ABI = [
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function setResolver(bytes32 node, address resolver)'
];

// Name Wrapper ABI - only the functions we need
export const NAME_WRAPPER_ABI = [
  'function ownerOf(uint256 id) view returns (address)',
  'function getData(uint256 id) view returns (address owner, uint32 fuses, uint64 expiry)',
  'function setResolver(bytes32 node, address resolver)',
  'function isWrapped(bytes32 node) view returns (bool)'
];

// ENS Registry addresses
export const ENS_REGISTRY_ADDRESS = {
  mainnet: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
  sepolia: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e'
};

// Name Wrapper addresses
export const NAME_WRAPPER_ADDRESS = {
  mainnet: '0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401',
  sepolia: '0x0635513f179D50A207757E05759CbD106d7dFcE8'
};

// Etherscan explorer configuration
export interface EtherscanConfig {
  apiUrl: string;
  apiKey: string;
  browserUrl: string;
}

export interface ChainConfig {
  name: string;
  icon: string;
  verifier: string;
  chainId: number;
  appkitChain: AppKitNetwork;
  rpcUrl: string;
  etherscan: EtherscanConfig;
  isTestnet: boolean;
  // Display information about the finalization process
  finalizationInfo?: {
    title: string;
    gatewayUrl?: string;
    proofSystem?: string;
    relevantL1Contract?: string;
    description: string;
    postingSchedule?: string;
    time: string;
    downReason?: string;
  };
}

// Verifier addresses from https://gateway-docs.unruggable.com/verifiers/deployments
// TODO: Dynamic resolution of verifier addresses
export const l1Chains: ChainConfig[] = [
  { 
    name: 'Mainnet', 
    icon: '/icons/optimism.png',
    verifier: '', 
    chainId: 1,
    appkitChain: mainnet,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api.etherscan.io/api',
      browserUrl: 'https://etherscan.io',
      apiKey: 'TBTVSSYVWHC66F5PQ6HYTSYF5MN1IA6BKN'
    },
    isTestnet: false,
  },
  { 
    name: 'Sepolia', 
    icon: '/icons/arbitrum.png',
    verifier: '', 
    chainId: 11155111,
    appkitChain: sepolia,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api-sepolia.etherscan.io/api',
      browserUrl: 'https://sepolia.etherscan.io',
      apiKey: 'TBTVSSYVWHC66F5PQ6HYTSYF5MN1IA6BKN'
    },
    isTestnet: true,
  },
];

export const l2Chains: ChainConfig[] = [
  { 
    name: 'Optimism', 
    icon: '/icons/optimism.png',
    verifier: '0x617f49e3c51f34c53Ef416C5151481ed639a8881', 
    chainId: 10,
    appkitChain: optimism,
    rpcUrl: 'https://opt-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api-optimistic.etherscan.io/api',
      browserUrl: 'https://optimistic.etherscan.io',
      apiKey: 'JQC7AG12NDBYNEKUCM4VHD5CN38X3A4SF6'
    },
    isTestnet: false,
    finalizationInfo: {
      title: 'Optimism Finalization',
      gatewayUrl: 'https://optimism.gateway.unruggable.com',
      proofSystem: 'Fault Proof - Dispute Games',
      relevantL1Contract: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9',
      description: 'Our Optimism gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Optimism posts a new state root approximately every 1 hour.',
      time: '1 hour'
    }
  },
  { 
    name: 'Arbitrum', 
    icon: '/icons/arbitrum.png',
    verifier: '0x5c4883c5E0EFc36a51aA1dBbd8f779215Fa22ED9', 
    chainId: 42161,
    appkitChain: arbitrum,
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api.arbiscan.io/api',
      browserUrl: 'https://arbiscan.io',
      apiKey: '5WGPP89GJ6ESFBABAQJFUQEI8VK6RMA1H1'
    },
    isTestnet: false,
    finalizationInfo: {
      title: 'Arbitrum Finalization',
      gatewayUrl: 'https://arbitrum.gateway.unruggable.com',
      proofSystem: 'Fault Proof - BoLD',
      relevantL1Contract: '0x1c479675ad559DC151F6Ec7ed3FbF8ceE79582B6',
      description: 'Our Arbitrum gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Arbitrum posts a new state root approximately every 2 minutes.',
      time: '~2 minutes',
      downReason: 'The Arbitrum Sepolia gateway is currently down due to an upgrade to the Arbitrum rollup contract to utilize their BoLD proof system. We are working on restoring it as soon as possible.'
    }
  },
  { 
    name: 'Base', 
    icon: '/icons/base.png',
    verifier: '0x82304C5f4A08cfA38542664C5B78e1969cA49Cec', 
    chainId: 8453,
    appkitChain: base,
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api.basescan.org/api',
      browserUrl: 'https://basescan.org',
      apiKey: '6F37IA4S6TU3X822P27WT4BFCFB9WGXWIK'
    },
    isTestnet: false,
    finalizationInfo: {
      title: 'Base Finalization',
      gatewayUrl: 'https://base.gateway.unruggable.com',
      proofSystem: 'Fault Proof - Dispute Games',
      relevantL1Contract: '0xe5965Ab5962eDc7477C8520243A95517CD252fA9',
      description: 'Our Base gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Base posts a new state root approximately every 1 hour.',
      time: '1 hour'
    }
  },
  { 
    name: 'Linea', 
    icon: '/icons/linea.png',
    verifier: '0x37041498CF4eE07476d2EDeAdcf82d524Aa22ce4', 
    chainId: 59144,
    appkitChain: linea,
    rpcUrl: 'https://linea-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api.lineascan.build/api',
      browserUrl: 'https://lineascan.build',
      apiKey: 'AR3FX48MDN1DNB8GRT6YZJ27U6X6GG2HJM'
    },
    isTestnet: false,
    finalizationInfo: {
      title: 'Linea Finalization',
      gatewayUrl: 'https://linea.gateway.unruggable.com',
      proofSystem: 'Execution Proof - zk-SNARK',
      relevantL1Contract: '0xd19d4b5d358258f05d7b411e21a1460d11b0876f',
      description: 'Our Linea gateway works with batches of blocks/transactions finalised on Layer 1 Ethereum.',
      postingSchedule: 'Linea finalises batches of blocks/transactions approximately every 2 - 8 hours.',
      time: '2 - 8 hours'
    }
  },
  { 
    name: 'Scroll', 
    icon: '/icons/scroll.png',
    verifier: '0xdb47469576FC71DD8b8A68BBB7172ed8E123a3DE', 
    chainId: 534352,
    appkitChain: scroll,
    rpcUrl: 'https://scroll-mainnet.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    etherscan: {
      apiUrl: 'https://api.scrollscan.com/api',
      browserUrl: 'https://scrollscan.com',
      apiKey: 'GZRWXMUBAYDZA2BE6MG8USWE2Z9CM6AYZ5'
    },
    isTestnet: false,
    finalizationInfo: {
      title: 'Scroll Finalization',
      gatewayUrl: 'https://scroll.gateway.unruggable.com',
      proofSystem: 'Execution Proof - zkEVM',
      relevantL1Contract: '0xa13BAF47339d63B743e7Da8741db5456DAc1E556',
      description: 'Our Scroll Sepolia gateway works with batches of blocks/transactions finalised on Layer 1 Ethereum.',
      postingSchedule: 'Scroll finalises a bundle on Layer 1 every 1 - 2 hours.',
      time: '1 - 2 hours'
    }
  },
];

export const l2TestnetChains: ChainConfig[] = [
  { 
    name: 'Optimism Sepolia',
    icon: '/icons/optimism.png',
    chainId: 11155420,
    appkitChain: optimismSepolia,
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    verifier: '0x5F1681D608e50458D96F43EbAb1137bA1d2A2E4D',
    etherscan: {
      apiUrl: 'https://api-sepolia-optimistic.etherscan.io/api',
      browserUrl: 'https://sepolia-optimistic.etherscan.io',
      apiKey: 'JQC7AG12NDBYNEKUCM4VHD5CN38X3A4SF6'
    },
    isTestnet: true,
    finalizationInfo: {
      title: 'Optimism Sepolia Finalization',
      gatewayUrl: 'https://optimism-sepolia.gateway.unruggable.com',
      proofSystem: 'Fault Proof - Dispute Games',
      relevantL1Contract: '0x05F9613aDB30026FFd634f38e5C4dFd30a197Fa1',
      description: 'Our Optimism Sepolia gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Optimism Sepolia posts a new state root approximately every 15 minutes.',
      time: '15 minutes'
    }
  },
  { 
    name: 'Arbitrum Sepolia',
    icon: '/icons/arbitrum.png',
    chainId: 421614,
    appkitChain: arbitrumSepolia,
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    verifier: '0x9133D1A6409b25546147229E102DFa439048028F',
    etherscan: {
      apiUrl: 'https://api-sepolia.arbiscan.io/api',
      browserUrl: 'https://sepolia.arbiscan.io',
      apiKey: '5WGPP89GJ6ESFBABAQJFUQEI8VK6RMA1H1'
    },
    isTestnet: true,
    finalizationInfo: {
      title: 'Arbitrum Sepolia Finalization',
      gatewayUrl: 'https://arbitrum-sepolia.gateway.unruggable.com',
      proofSystem: 'Fault Proof - BoLD',
      relevantL1Contract: '0x6c97864CE4bEf387dE0b3310A44230f7E3F1be0D',
      description: 'Our Arbitrum Sepolia gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Arbitrum Sepolia posts a new state root approximately every 2 minutes.',
      time: '~2 minutes',
      downReason: 'The Arbitrum Sepolia gateway is currently down due to an upgrade to the Arbitrum rollup contract to utilize their BoLD proof system. We are working on restoring it as soon as possible.'

    }
  },
  { 
    name: 'Base Sepolia',
    icon: '/icons/base.png',
    chainId: 84532,
    appkitChain: baseSepolia,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    verifier: '0x8e77b311bed6906799BD3CaFBa34c13b64CAF460',
    etherscan: {
      apiUrl: 'https://api-sepolia.basescan.org/api',
      browserUrl: 'https://sepolia.basescan.org',
      apiKey: '6F37IA4S6TU3X822P27WT4BFCFB9WGXWIK'
    },
    isTestnet: true,
    finalizationInfo: {
      title: 'Base Finalization',
      gatewayUrl: 'https://base-sepolia.gateway.unruggable.com',
      proofSystem: 'Fault Proof - Dispute Games',
      relevantL1Contract: '0xd6E6dBf4F7EA0ac412fD8b65ED297e64BB7a06E1',
      description: 'Our Base Sepolia gateway implements an unfinalised gateway to provide an optimal developer experience. All state roots posted to L1 are considered valid.',
      postingSchedule: 'Base Sepolia posts a new state root approximately every 1 hour.',
      time: '1 hour'
    }
  },
  { 
    name: 'Linea Sepolia',
    icon: '/icons/linea.png',
    chainId: 59141,
    appkitChain: lineaSepolia,
    rpcUrl: 'https://linea-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    verifier: '0x6AD2BbEE28e780717dF146F59c2213E0EB9CA573',
    etherscan: {
      apiUrl: 'https://api-sepolia.lineascan.build/api',
      browserUrl: 'https://sepolia.lineascan.build',
      apiKey: 'AR3FX48MDN1DNB8GRT6YZJ27U6X6GG2HJM'
    },
    isTestnet: true,
    finalizationInfo: {
      title: 'Linea Sepolia Finalization',
      gatewayUrl: 'https://linea-sepolia.gateway.unruggable.com',
      proofSystem: 'Execution Proof - zk-SNARK',
      relevantL1Contract: '0xb218f8a4bc926cf1ca7b3423c154a0d627bdb7e5',
      description: 'Our Linea Sepolia gateway works with batches of blocks/transactions finalised on Layer 1 Ethereum.',
      postingSchedule: 'Linea Sepolia finalises batches of blocks/transactions approximately every 2 - 8 hours.',
      time: '2 - 8 hours'
    }
  },
  { 
    name: 'Scroll Sepolia',
    icon: '/icons/scroll.png',
    chainId: 534351,
    appkitChain: scrollSepolia,
    rpcUrl: 'https://scroll-sepolia.g.alchemy.com/v2/gfoGxt2sRsBbZLwgKkZa5q2kRO8U5wda',
    verifier: '',
    etherscan: {
      apiUrl: 'https://api-sepolia.scrollscan.com/api',
      browserUrl: 'https://sepolia.scrollscan.com',
      apiKey: 'GZRWXMUBAYDZA2BE6MG8USWE2Z9CM6AYZ5'
    },
    isTestnet: true,
    finalizationInfo: {
      title: 'Scroll Sepolia Finalization',
      gatewayUrl: 'https://scroll-sepolia.gateway.unruggable.com',
      proofSystem: 'Execution Proof - zkEVM',
      relevantL1Contract: '0x2D567EcE699Eabe5afCd141eDB7A4f2D0D6ce8a0',
      description: 'Our Scroll Sepolia gateway works with batches of blocks/transactions finalised on Layer 1 Ethereum.',
      postingSchedule: 'Scroll Sepolia finalises a bundle on Layer 1 every 1 - 3 hours.',
      time: '1 - 3 hours',
      downReason: 'The Scroll Sepolia gateway is currently down due to an upgrade to their rollup contract. We are working on restoring it as soon as possible.'
    }
  },
];

export type DeployedContract = {
  address: string;
  source: string;
  encodedArgs: string;
  version: string;
  optimization: boolean;
  runs: number;
};