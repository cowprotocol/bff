import {
  ALL_SUPPORTED_CHAIN_IDS,
  ALL_SUPPORTED_CHAINS,
  SupportedChainId,
  WRAPPED_NATIVE_CURRENCIES,
} from '@cowprotocol/cow-sdk';
import { Address } from 'viem';

/**
 * Native currency address. For example, represents Ether in Mainnet and Arbitrum, and xDAI in Gnosis chain.
 */
export const NativeCurrencyAddress =
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * Wrapped native token address. For example, represents WETH in Mainnet and Arbitrum, and wxDAI in Gnosis chain.
 */
export const WrappedNativeTokenAddress: Record<SupportedChainId, Address> =
  Object.values(WRAPPED_NATIVE_CURRENCIES).reduce((acc, curr) => {
    acc[curr.chainId as SupportedChainId] = curr.address as Address;
    return acc;
  }, {} as Record<SupportedChainId, Address>);

export const ChainNames: Record<SupportedChainId, string> = Object.values(
  ALL_SUPPORTED_CHAINS
).reduce((acc, curr) => {
  acc[curr.id as SupportedChainId] = curr.label;
  return acc;
}, {} as Record<SupportedChainId, string>);

// TODO: Get from SDK
export const EXPLORER_NETWORK_NAMES: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'gc',
  [SupportedChainId.ARBITRUM_ONE]: 'arb1',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'pol',
  [SupportedChainId.AVALANCHE]: 'avax',
  [SupportedChainId.LENS]: 'lens',
  [SupportedChainId.BNB]: 'bnb',
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
  [SupportedChainId.LENS]: 'lens',
  [SupportedChainId.BNB]: 'bnb',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

export const AllChainIds: SupportedChainId[] = ALL_SUPPORTED_CHAIN_IDS;
