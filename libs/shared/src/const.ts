import { Address } from 'viem';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

/**
 * Native currency address. For example, represents Ether in Mainnet and Arbitrum, and xDAI in Gnosis chain.
 */
export const NativeCurrencyAddress =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * Wrapped native token address. For example, represents WETH in Mainnet and Arbitrum, and wxDAI in Gnosis chain.
 */
export const WrappedNativeTokenAddress: Record<SupportedChainId, Address> = {
  [SupportedChainId.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [SupportedChainId.GNOSIS_CHAIN]: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
  [SupportedChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  [SupportedChainId.BASE]: '0x4200000000000000000000000000000000000006',
  [SupportedChainId.POLYGON]: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
  [SupportedChainId.AVALANCHE]: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
  [SupportedChainId.SEPOLIA]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};

// TODO: Get from SDK
export const ChainNames: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'Mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'Gnosis Chain',
  [SupportedChainId.ARBITRUM_ONE]: 'Arbitrum',
  [SupportedChainId.BASE]: 'Base',
  [SupportedChainId.POLYGON]: 'Polygon',
  [SupportedChainId.AVALANCHE]: 'Avalanche',
  [SupportedChainId.SEPOLIA]: 'Sepolia',
};

// TODO: Get from SDK
export const EXPLORER_NETWORK_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'gc',
  [SupportedChainId.ARBITRUM_ONE]: 'arb1',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'pol',
  [SupportedChainId.AVALANCHE]: 'avax',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

// TODO: Get from SDK
export const COW_API_NETWORK_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum_one',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.AVALANCHE]: 'avalanche',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

export const AllChainIds: SupportedChainId[] = Object.values(SupportedChainId)
  .filter((value) => typeof value === 'number') // Filter out non-numeric values
  .map((value) => value as number); // Map to number
