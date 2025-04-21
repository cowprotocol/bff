import {
  COW_PROTOCOL_SETTLEMENT_CONTRACT_ADDRESS,
  SupportedChainId,
} from '@cowprotocol/cow-sdk';
import { Notification } from '@cowprotocol/notifications';
import { Erc20, Erc20Repository, viemClients } from '@cowprotocol/repositories';
import { formatUnits, getAddress, parseAbi } from 'viem';
import { bigIntReplacer, logger } from '@cowprotocol/shared';

const EVENTS = parseAbi([
  'event OrderInvalidated(address indexed owner, bytes orderUid)',
  'event Trade(address indexed owner, address sellToken, address buyToken, uint256 sellAmount, uint256 buyAmount, uint256 feeAmount, bytes orderUid)',
]);

// TODO: Get from SDK
const CHAIN_NAME_MAP: Record<SupportedChainId, string> = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.ARBITRUM_ONE]: 'arb1',
  [SupportedChainId.GNOSIS_CHAIN]: 'gc',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.SEPOLIA]: 'sepolia',
};

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

  logger.info(`${prefix} Found ${logs.length} events`);

  const notificationPromises = logs.reduce<Promise<Notification>[]>(
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
            getTradeNotification({
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
            getOrderInvalidatedNotification({
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

async function getTradeNotification(props: {
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
}): Promise<Notification> {
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
  logger.info(`${prefix} New ${message}`);
  return {
    id,
    account: owner,
    title: 'New Trade',
    message,
    url,
  };
}

async function getOrderInvalidatedNotification(props: {
  id: string;
  chainId: SupportedChainId;
  orderUid: string;
  owner: string;
  prefix: string;
}): Promise<Notification> {
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

function formatAmount(amount: bigint, decimals: number | undefined) {
  return decimals ? formatUnits(amount, decimals) : amount.toString();
}

function formatTokenName(token: Erc20 | null) {
  return token?.symbol ? `${token.symbol}` : token?.address;
}

interface TradeNotificationProducerState {
  lastBlock: string;
  lastBlockTimestamp: string;
  lastBlockHash: string;
}

function getExplorerUrl(chainId: SupportedChainId, orderUid: string) {
  const baseUrl = getExplorerBaseUrl(chainId);
  return `${baseUrl}/orders/${orderUid}`;
}

function getExplorerBaseUrl(chainId: SupportedChainId) {
  const suffix =
    chainId === SupportedChainId.MAINNET ? '' : `/${CHAIN_NAME_MAP[chainId]}`;
  return `https://explorer.cow.fi${suffix}`;
}
