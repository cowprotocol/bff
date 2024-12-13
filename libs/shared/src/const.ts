import { Address } from 'viem';
import { SupportedChainId } from './types';

/**
 * Native currency address. For example, represents Ether in Mainnet and Arbitrum, and xDAI in Gnosis chain.
 */
export const NativeCurrencyAddress =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const NativeCurrencyDecimals: Record<SupportedChainId, number> = {
  [SupportedChainId.MAINNET]: 18,
  [SupportedChainId.GNOSIS_CHAIN]: 18,
  [SupportedChainId.ARBITRUM_ONE]: 18,
  [SupportedChainId.SEPOLIA]: 18,
  [SupportedChainId.BASE]: 18,
};

/**
 * Wrapped native token address. For example, represents WETH in Mainnet and Arbitrum, and wxDAI in Gnosis chain.
 */
export const WrappedNativeTokenAddress: Record<SupportedChainId, Address> = {
  [SupportedChainId.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [SupportedChainId.GNOSIS_CHAIN]: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
  [SupportedChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  [SupportedChainId.BASE]: '0x4200000000000000000000000000000000000006',
  [SupportedChainId.SEPOLIA]: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};

export const ChainNames: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'Mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'Gnosis Chain',
  [SupportedChainId.ARBITRUM_ONE]: 'Arbitrum',
  [SupportedChainId.BASE]: 'Base',
  [SupportedChainId.SEPOLIA]: 'Sepolia',
};

export const AllChainIds: SupportedChainId[] = Object.values(SupportedChainId)
  .filter((value) => typeof value === 'number') // Filter out non-numeric values
  .map((value) => value as number); // Map to number

export const ETHEREUM_ADDRESS_LENGTH = 42