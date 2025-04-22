import { getExplorerUrl, logger, SupportedChainId } from '@cowprotocol/shared';
import { PushNotification } from '@cowprotocol/notifications';

export async function fromOrderInvalidationToNotification(props: {
  id: string;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  prefix: string;
}): Promise<PushNotification> {
  const { id, chainId, orderUid, owner, prefix } = props;
  const message = 'Order invalidated ' + orderUid;
  const url = getExplorerUrl(chainId, orderUid);
  logger.info(`${prefix} ${message}`);

  return {
    id,
    account: owner,
    title: 'Trade',
    message,
    url,
  };
}
