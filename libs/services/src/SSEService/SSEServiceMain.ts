import { injectable } from 'inversify';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';
import { UserTokenBalanceWithToken } from '../TokenBalancesService/TokenBalancesService';
import { BalanceAllowanceChangeEvent } from '../BalanceTrackingService/BalanceTrackingService';
import { SSEService, SSEClient } from './SSEService';

@injectable()
export class SSEServiceMain implements SSEService {
  private clients = new Map<string, SSEClient>();

  addClient(client: SSEClient): void {
    this.clients.set(client.clientId, client);
    logger.info(
      `SSE client ${client.clientId} connected for user ${client.userAddress} on chain ${client.chainId}`
    );
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.close();
      this.clients.delete(clientId);
      logger.info(`SSE client ${clientId} disconnected`);
    }
  }

  getClientsForUser(
    chainId: SupportedChainId,
    userAddress: string
  ): SSEClient[] {
    const userAddressLowerCase = userAddress.toLowerCase();
    return Array.from(this.clients.values()).filter(
      (client) =>
        client.chainId === chainId &&
        client.userAddress.toLowerCase() === userAddressLowerCase
    );
  }

  sendToClient(clientId: string, data: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.send(data);
      } catch (error) {
        logger.error(
          `Error sending data to SSE client ${client.clientId}:`,
          error
        );
        this.removeClient(client.clientId);
      }
    }
  }

  broadcastToUser(
    chainId: SupportedChainId,
    userAddress: string,
    data: string
  ): void {
    const clients = this.getClientsForUser(chainId, userAddress);

    clients.forEach((client) => {
      this.sendToClient(client.clientId, data);
    });
  }

  broadcastBalanceUpdate(event: BalanceAllowanceChangeEvent): void {
    const clients = this.getClientsForUser(event.chainId, event.userAddress);
    const tokenAddress = event.tokenAddress.toLowerCase();

    // Send the data to the clients
    const data = this.formatSSEData('balance_update', event);
    clients.forEach((client) => {
      // Make sure the client is interested in this specific token
      if (this.clientTracksToken(client, tokenAddress)) {
        this.sendToClient(client.clientId, data);
      }
    });
  }

  broadcastInitialBalances(
    clientId: string,
    balances: UserTokenBalanceWithToken[]
  ): void {
    const data = this.formatSSEData('initial_balances', { balances });
    this.sendToClient(clientId, data);
  }

  private formatSSEData(eventType: string, data: unknown): string {
    return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  }

  /**
   * Check if the client is interested in the given token
   *
   * @param client the client to check
   * @param tokenAddressLowerCase expected to be in lowercase
   * @returns true if the client is interested in the given token, false otherwise
   */
  private clientTracksToken(
    client: SSEClient,
    tokenAddressLowerCase: string
  ): boolean {
    return client.tokenAddresses.some(
      (address) => address.toLowerCase() === tokenAddressLowerCase
    );
  }

  // Cleanup method to remove all clients (useful for graceful shutdown)
  cleanup(): void {
    const clientIds = Array.from(this.clients.keys());
    clientIds.forEach((id) => {
      this.removeClient(id);
    });
  }
}
