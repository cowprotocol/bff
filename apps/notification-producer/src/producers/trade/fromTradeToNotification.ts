import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { PushNotification } from '@cowprotocol/notifications';
import { Erc20Repository } from '@cowprotocol/repositories';
import { getAddress } from 'viem';
import {
  ChainNames,
  formatAmount,
  formatTokenName,
  getExplorerUrl,
  logger,
} from '@cowprotocol/shared';

export async function fromTradeToNotification(props: {
  prefix: string;
  id: string;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: bigint;
  buyAmount: bigint;
  feeAmount: bigint;
  erc20Repository: Erc20Repository;
}): Promise<PushNotification> {
  const {
    id,
    chainId,
    owner,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
    erc20Repository,
    prefix,
    orderUid,
  } = props;

  const sellToken = await erc20Repository.get(
    chainId,
    getAddress(sellTokenAddress)
  );

  const buyToken = await erc20Repository.get(
    chainId,
    getAddress(buyTokenAddress)
  );

  const sellAmountFormatted = formatAmount(sellAmount, sellToken?.decimals);
  const buyAmountFormatted = formatAmount(buyAmount, buyToken?.decimals);

  const sellTokenName = formatTokenName(sellToken);
  const buyTokenName = formatTokenName(buyToken);

  const message = `Trade ${sellAmountFormatted} ${sellTokenName} for ${buyAmountFormatted} ${buyTokenName}`;
  const url = orderUid ? getExplorerUrl(chainId, orderUid) : undefined;
  logger.info(`${prefix} New ${message} for ${owner}`);
  return {
    id,
    account: owner,
    title: `New Trade from ${owner} in ${ChainNames[chainId]}`,
    message,
    url,
  };
}
