import { PushNotification } from '@cowprotocol/notifications';
import { Erc20Repository, ParsedExpiredOrder } from '@cowprotocol/repositories';
import { getExplorerUrl } from '@cowprotocol/shared';
import { type SupportedChainId } from '@cowprotocol/cow-sdk';
import { getNotificationSummary } from '../../utils/getNotificationSummary';

export interface ExpiredOrderNotificationContext {
  chainId: SupportedChainId;
  nowTimestamp: number;
  lastCheckTimestamp: number;
  isEthFlowOrder: boolean;
  owner: string;
  erc20Repository: Erc20Repository;
}

export async function getExpiredOrderNotification(
  expiredOrder: ParsedExpiredOrder,
  notificationContext: ExpiredOrderNotificationContext
): Promise<PushNotification> {
  const { chainId, lastCheckTimestamp, nowTimestamp, isEthFlowOrder, owner, erc20Repository } = notificationContext;

  const summary = await getNotificationSummary({
    chainId,
    isEthFlowOrder,
    erc20Repository,
    sellAmount: expiredOrder.sellAmount,
    buyAmount: expiredOrder.buyAmount,
    sellTokenAddress: expiredOrder.sellTokenAddress,
    buyTokenAddress: expiredOrder.buyTokenAddress
  });

  const title = `🕐 Order ${summary} has expired`;
  const message = `
  Expiration time: ${new Date(expiredOrder.validTo * 1000).toISOString()}.
  Account: ${owner}.
  `.trim();

  const url = getExplorerUrl(chainId, expiredOrder.uid);

  return {
    id: 'OrderExpired-' + expiredOrder.validTo + '-' + lastCheckTimestamp,
    account: expiredOrder.owner.toLowerCase(),
    title,
    message,
    url,
    context: {
      chainId: chainId.toString(),
      nowTimestamp: nowTimestamp.toString()
    }
  };
}