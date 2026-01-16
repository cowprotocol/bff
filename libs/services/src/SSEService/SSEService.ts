import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { UserTokenBalanceWithToken } from '../TokenBalancesService/TokenBalancesService';
import { BalanceAllowanceChangeEvent } from '../BalanceTrackingService/BalanceTrackingService';

export const sseServiceSymbol = Symbol.for('SSEService');

/**
 * Models a client subscription to some events, like balance and allowance changes
 */
export interface SSEClient {
  clientId: string;
  chainId: SupportedChainId;
  userAddress: string;
  tokenAddresses: string[]; // TODO: For now, I will let the client specify the list of addresses to track, but as most users use the default list, we could let them specify the lists and the additional tokens on top
  send: (data: string) => void;
  close: () => void;
}

/**
 * Service to manage SSE clients and broadcast events to them
 *
 * Initially focused on balance and allowance tracking, but could be extended to other events (experimental, hackathon mode!)
 */
export interface SSEService {
  addClient(client: SSEClient): void;
  removeClient(clientId: string): void;

  /**
   * Send data to a specific client
   * @param clientId
   * @param data
   */
  sendToClient(clientId: string, data: string): void;

  /**
   * Return the SSE client subscriptions for a given user account and chain
   * @param chainId
   * @param userAddress
   */
  getClientsForUser(
    chainId: SupportedChainId,
    userAddress: string
  ): SSEClient[];

  /**
   * Broadcast an event to users
   * @param chainId
   * @param userAddress
   * @param data
   */
  broadcastToUser(
    chainId: SupportedChainId,
    userAddress: string,
    data: string // TODO: For now this kept agnostic to what is being sent, so other services can push any data. I also added "broadcastBalanceUpdate" which are specific, we might want to delete either the more generic or the most specific (so its done in another service). For now, just experimenting
  ): void;

  /**
   * Broadcast user's initial balances and allowances
   * @param clientId
   * @param balances
   */
  broadcastInitialBalances(
    clientId: string,
    balances: UserTokenBalanceWithToken[]
  ): void;

  /**
   * Push a balance update event to the clients
   * @param event
   */
  broadcastBalanceUpdate(event: BalanceAllowanceChangeEvent): void;
}
