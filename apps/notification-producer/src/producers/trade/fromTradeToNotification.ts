import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { PushNotification } from '@cowprotocol/notifications';
import { Erc20Repository } from '@cowprotocol/repositories';
import { getExplorerUrl, logger } from '@cowprotocol/shared';
import { getNotificationSummary } from '../../utils/getNotificationSummary';

export async function fromTradeToNotification(props: {
  prefix: string;
  id: string;
  isEthFlowOrder: boolean;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  sellTokenAddress: string;
  buyTokenAddress: string;
  sellAmount: bigint;
  buyAmount: bigint;
  feeAmount: bigint;
  erc20Repository: Erc20Repository;
  transactionHash: string;
  logIndex: number;
}): Promise<PushNotification> {
  const {
    id,
    chainId,
    owner,
    isEthFlowOrder,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount,
    erc20Repository,
    prefix,
    orderUid,
    transactionHash,
    logIndex
  } = props;

  const summary = await getNotificationSummary({
    chainId,
    isEthFlowOrder,
    erc20Repository,
    sellTokenAddress,
    buyTokenAddress,
    sellAmount,
    buyAmount
  });

  const title = `Trade ${summary}`;
  const message = `Account: ${owner}`;

  const url = orderUid ? getExplorerUrl(chainId, orderUid) : undefined;
  logger.info(
    `${prefix} New ${message} for ${owner}. Tx=${transactionHash}, logIndex=${logIndex}`
  );
  return {
    id,
    account: owner,
    title,
    message,
    url,
    context: {
      transactionHash,
      logIndex: logIndex.toString()
    }
  };
}
