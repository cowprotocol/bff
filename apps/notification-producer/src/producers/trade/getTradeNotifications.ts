import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { PushNotification } from '@cowprotocol/notifications';
import { Erc20Repository, getViemClients } from '@cowprotocol/repositories';
import { bigIntReplacer, logger } from '@cowprotocol/shared';
import { getAddress, parseAbi } from 'viem';
import { fromTradeToNotification } from './fromTradeToNotification';

const EVENTS = parseAbi([
  // 'event OrderInvalidated(address indexed owner, bytes orderUid)', // Do not index this event
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

  const client = getViemClients()[chainId];

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
