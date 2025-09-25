import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
export const MORALIS_API_BASE_URL = 'https://deep-index.moralis.io/api';

/**
 * From https://docs.moralis.com/supported-web3data-apis
 */
export const MORALIS_CLIENT_NETWORK_MAPPING: Record<
  SupportedChainId,
  string | null
> = {
  [SupportedChainId.MAINNET]: 'eth',
  [SupportedChainId.SEPOLIA]: 'sepolia',
  [SupportedChainId.GNOSIS_CHAIN]: 'gnosis',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.AVALANCHE]: 'avalanche',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.LENS]: null,
  [SupportedChainId.BNB]: 'bsc', // TODO: confirm
};
