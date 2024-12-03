import 'hardhat-watcher'
import { vars } from "hardhat/config";
import type { HardhatUserConfig } from "hardhat/config";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-toolbox";

import * as dotenv from "dotenv";
dotenv.config();

import { chainNames, defaultRpcUrls, infuraSupportedNetworks, SupportedChainId } from './scripts/chains';
import { ChainConfig, ChainConfigMinimal, etherscanApiKeys, etherscanConfig } from './scripts/explorers';
import { NetworkUserConfig } from 'hardhat/types';

const infuraApiKey: string | undefined = process.env.INFURA_API_KEY;
if (!infuraApiKey) {
  throw new Error("Please set your INFURA_API_KEY in a .env file");
}

// Ensure that we have all the environment variables we need.
const mnemonic: string | undefined = process.env.MNEMONIC;

const deployerPK: string | undefined = vars.get("DEPLOYER_PK");
const hasPK = deployerPK;

if (!mnemonic && !hasPK) {
  throw new Error("Please set your PK or MNEMONIC in a .env file");
}



function isValidChainId(value: number | undefined): value is SupportedChainId {
  return value !== undefined && Object.values(SupportedChainId).includes(value);
}

// Runtime check to ensure all required keys are present
// Build/compile time check with a type to enforce this doesn't seem possible
function verifyConfigIntegrity(
  config: Partial<Record<SupportedChainId, ChainConfigMinimal>>,
  apiKeys: Record<SupportedChainId, string>,
) {
  for (const key in config) {
    if (!(key in apiKeys)) {
      throw new Error(`Explorer API key for ${SupportedChainId[key as any]} is missing`);
    }
  }
}

// Call this function at the start of your application
verifyConfigIntegrity(etherscanConfig, etherscanApiKeys as Record<SupportedChainId, string>);

function getChainUrl(chainId: SupportedChainId): string {
  // Check if the chainId has a custom URL in infuraSupportedNetworks
  if (infuraSupportedNetworks[chainId]) {
    return `https://${chainNames[chainId]}.infura.io/v3/${infuraApiKey}`;
  }

  return defaultRpcUrls[chainId];
}

function getChainConfig(chainId: SupportedChainId): NetworkUserConfig {
  const jsonRpcUrl = getChainUrl(chainId);

  return {
    accounts: hasPK
      ? [deployerPK]
      : {
          count: 10,
          mnemonic: mnemonic!,
          path: "m/44'/60'/0'/0",
        },
    chainId,
    url: jsonRpcUrl,
    timeout: 60_000, // added as the default timeout isn't sufficient for Hedera
  };
}

const chainConfigs = Object.entries(chainNames).reduce((config, [chainIdString, chainName]) => {
  const chainId = Number(chainIdString);
  if (isValidChainId(chainId)) {
    config[chainName] = getChainConfig(chainId);
    return config;
  } else {
    throw new Error("Invalid chainId");
  }
}, {} as Record<string, NetworkUserConfig>);

const chainVerifyApiKeys = Object.entries(chainNames).reduce((config, [chainIdString, chainName]) => {
  const chainId = Number(chainIdString);
  if (isValidChainId(chainId)) {
    config[chainName] = etherscanApiKeys[chainId] || "";
    return config;
  } else {
    throw new Error("Invalid chainId");
  }
}, {} as Record<string, string>);

const chainConfigsArray: ChainConfig[] = Object.entries(etherscanConfig).reduce((acc, [chainIdString, config]) => {
  const chainId = Number(chainIdString) as SupportedChainId;
  const networkName = chainNames[chainId];
  // Construct the ChainConfig object if URLs are provided
  if (config?.urls) {
    const chainConfig: ChainConfig = {
      network: networkName,
      chainId,
      urls: config.urls,
    };
    acc.push(chainConfig);
  }
  return acc;
}, [] as ChainConfig[]);


const LOW_OPTIMIZER_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 2_000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const LOWEST_OPTIMIZER_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 1_000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const DEFAULT_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    evmVersion: 'istanbul',
    optimizer: {
      enabled: true,
      runs: 1_000_000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  },
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  namedAccounts: {
    deployer: 0,
  },
  networks: {
    ...chainConfigs,
    // NOTE: chainConfigs is destructed before "hardhat" and "ganache" below so as to not overwrite the configs below
    hardhat: {
      accounts: {
        mnemonic,
      },
      chainId: SupportedChainId.HARDHAT,
    },
    ganache: {
      accounts: {
        mnemonic,
      },
      chainId: SupportedChainId.GANACHE,
      url: "http://localhost:8545",
    },
  },
  etherscan: {
    apiKey: {
      ...chainVerifyApiKeys,
    },
    customChains: chainConfigsArray,
  },
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
    overrides: {
      'contracts/NonfungiblePositionManager.sol': LOW_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/test/MockTimeNonfungiblePositionManager.sol': LOW_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/test/NFTDescriptorTest.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/NonfungibleTokenPositionDescriptor.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
      'contracts/libraries/NFTDescriptor.sol': LOWEST_OPTIMIZER_COMPILER_SETTINGS,
    },
  },
  watcher: {
    test: {
      tasks: [{ command: 'test', params: { testFiles: ['{path}'] } }],
      files: ['./test/**/*'],
      verbose: true,
    },
  },
}

export default config;