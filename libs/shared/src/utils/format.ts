import { formatUnits } from 'viem';

import { EXPLORER_NETWORK_NAMES } from '../const';
import { SupportedChainId } from '../types';

export function getExplorerUrl(chainId: SupportedChainId, orderUid: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return `${baseUrl}/orders/${orderUid}`;
}

export function getExplorerBaseUrl(chainId: SupportedChainId) {
  const suffix =
    chainId === SupportedChainId.MAINNET
      ? ''
      : `/${EXPLORER_NETWORK_NAMES[chainId]}`;
  return `https://explorer.cow.fi${suffix}`;
}

export function formatAmount(amount: bigint, decimals: number | undefined) {
  return decimals ? formatUnits(amount, decimals) : amount.toString();
}

export function formatTokenName(
  token: { symbol?: string; address: string } | null
) {
  return token?.symbol ? `${token.symbol}` : token?.address;
}
