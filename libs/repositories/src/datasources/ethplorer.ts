import { SupportedChainId } from '@cowprotocol/cow-sdk';

export const ETHPLORER_API_KEY = process.env.ETHPLORER_API_KEY as string;

/**
 * From https://github.com/EverexIO/Ethplorer/wiki/Ethplorer-API#supported-chains
 */
export const ETHPLORER_BASE_URL: Record<SupportedChainId, string | null> = {
  [SupportedChainId.MAINNET]: 'https://api.ethplorer.io',
  [SupportedChainId.SEPOLIA]: 'https://sepolia-api.ethplorer.io',
  [SupportedChainId.GNOSIS_CHAIN]: null,
  [SupportedChainId.ARBITRUM_ONE]: null,
  [SupportedChainId.BASE]: null,
  [SupportedChainId.POLYGON]: null,
  [SupportedChainId.AVALANCHE]: null,
  [SupportedChainId.LENS]: null,
  [SupportedChainId.BNB]: 'https://api.binplorer.com',
  [SupportedChainId.LINEA]: 'https://api.lineaplorer.build',
  [SupportedChainId.PLASMA]: null,
};
