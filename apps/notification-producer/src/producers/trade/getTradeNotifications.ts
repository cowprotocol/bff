import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { PushNotification } from '@cowprotocol/notifications';
import { Erc20Repository, viemClients } from '@cowprotocol/repositories';
import { getAddress, parseAbi } from 'viem';
import { bigIntReplacer, logger } from '@cowprotocol/shared';
import { fromTradeToNotification } from './fromTradeToNotification';
import { fromOrderInvalidationToNotification } from './fromOrderInvalidationToNotification';

const EVENTS = parseAbi([
  'event OrderInvalidated(address indexed owner, bytes orderUid)',
  'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)',
]);

export interface GetTradeNotificationParams {
  accounts: string[];
  fromBlock: bigint;
  toBlock: bigint;
  chainId: SupportedChainId;
  erc20Repository: Erc20Repository;
  prefix: string;
}

export async function getTradeNotifications(
  params: GetTradeNotificationParams
) {
  const { accounts, fromBlock, toBlock, chainId, erc20Repository, prefix } =
    params;

  const client = viemClients[chainId];

  const logs = await client.getLogs({
    events: EVENTS,
    fromBlock,
    toBlock,
    address: getAddress(COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS[chainId]),
    args: {
      owner: accounts,
    } as any,
  });

  // Return empty array if no events
  if (logs.length === 0) {
    return [];
  }

  logger.debug(`${prefix} Found ${logs.length} events`);

  const notificationPromises = logs.reduce<Promise<PushNotification>[]>(
    (acc, log) => {
      switch (log.eventName) {
        case 'Trade': {
          const {
            owner,
            orderUid,
            sellToken: sellTokenAddress,
            buyToken: buyTokenAddress,
            sellAmount,
            buyAmount,
            feeAmount,
          } = log.args;
          if (
            owner === undefined ||
            sellTokenAddress === undefined ||
            buyTokenAddress === undefined ||
            orderUid === undefined ||
            sellAmount === undefined ||
            buyAmount === undefined ||
            feeAmount === undefined
          ) {
            logger.error(
              `${prefix} Invalid Trade event ${JSON.stringify(
                log,
                bigIntReplacer,
                2
              )}`
            );
            break;
          }

          acc.push(
            fromTradeToNotification({
              prefix,
              id: 'Trade-' + log.transactionHash + '-' + log.logIndex,
              chainId,
              orderUid,
              owner,
              sellTokenAddress,
              buyTokenAddress,
              sellAmount,
              buyAmount,
              feeAmount,
              erc20Repository,
              transactionHash: log.transactionHash,
              logIndex: log.logIndex,
            })
          );
          break;
        }

        case 'OrderInvalidated': {
          const { orderUid, owner } = log.args;
          if (orderUid === undefined || owner === undefined) {
            logger.error(
              `${prefix} Invalid OrderInvalidated event ${JSON.stringify(
                log,
                bigIntReplacer,
                2
              )}`
            );
            break;
          }

          // logger.info(`${this.prefix} ${message}`);
          acc.push(
            fromOrderInvalidationToNotification({
              id:
                'OrderInvalidated-' + log.transactionHash + '-' + log.logIndex,
              chainId,
              orderUid,
              owner,
              prefix: prefix,
            })
          );
          break;
        }
        default:
          logger.info(`${prefix} Unknown event ${log}`);
          break;
      }
      return acc;
    },
    []
  );

  // Return empty array if no notifications
  if (notificationPromises.length === 0) {
    return [];
  }

  return Promise.all(notificationPromises);
}
