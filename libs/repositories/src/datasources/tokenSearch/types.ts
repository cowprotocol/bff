import { SupportedChainId } from '@cowprotocol/cow-sdk';

export type TokenFromAPI = {
  chainId: SupportedChainId;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
};
