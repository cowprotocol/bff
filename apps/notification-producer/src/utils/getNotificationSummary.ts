import { NATIVE_CURRENCY_ADDRESS, SupportedChainId } from '@cowprotocol/cow-sdk';
import { getAddress } from 'viem';
import { ChainNames, formatAmount, formatTokenName } from '@cowprotocol/shared';
import { Erc20Repository } from '@cowprotocol/repositories';

interface OrderInfoForNotificationParams {
  chainId: SupportedChainId;
  isEthFlowOrder: boolean;
  erc20Repository: Erc20Repository;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: string | bigint;
  buyAmount: string | bigint;
}

export async function getNotificationSummary(params: OrderInfoForNotificationParams): Promise<string> {
  const { chainId, isEthFlowOrder, erc20Repository } = params;

  const sellToken = await erc20Repository.get(
    chainId,
    isEthFlowOrder ? NATIVE_CURRENCY_ADDRESS : getAddress(params.sellTokenAddress)
  );

  const buyToken = await erc20Repository.get(
    chainId,
    getAddress(params.buyTokenAddress)
  );

  const sellAmountFormatted = formatAmount(BigInt(params.sellAmount), sellToken?.decimals);
  const buyAmountFormatted = formatAmount(BigInt(params.buyAmount), buyToken?.decimals);

  const sellTokenName = formatTokenName(sellToken);
  const buyTokenName = formatTokenName(buyToken);

  return `${sellAmountFormatted} ${sellTokenName} for ${buyAmountFormatted} ${buyTokenName} in ${ChainNames[chainId]}`
}