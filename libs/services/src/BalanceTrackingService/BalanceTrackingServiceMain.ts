import { injectable, inject } from 'inversify';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';
import {
  UserBalanceRepository,
  UserTokenBalance,
  userBalanceRepositorySymbol,
} from '@cowprotocol/repositories';
import {
  BalanceTrackingService,
  BalanceAllowanceChangeEvent,
  BalanceChangeCallback,
  BalanceTrackingRequest,
} from './BalanceTrackingService';
import { SSEService, sseServiceSymbol } from '../SSEService/SSEService';

const POLLING_INTERVAL_MS = 5000; // 5 seconds // TODO: We should do this service more sophisticated. When a client subscribes, we poll more often, but because we want to use this is notifications, we might want to have other lower prio checking logics

export interface TrackedUser extends BalanceTrackingRequest {
  lastBalances: Map<string, UserTokenBalance>;
  intervalId: NodeJS.Timeout;
}

@injectable()
export class BalanceTrackingServiceMain implements BalanceTrackingService {
  private trackedUsers = new Map<string, TrackedUser>();
  private balanceChangeCallbacks: Array<BalanceChangeCallback> = [];

  constructor(
    @inject(userBalanceRepositorySymbol)
    private userBalanceRepository: UserBalanceRepository,
    @inject(sseServiceSymbol) private sseService?: SSEService
  ) {
    // Auto-connect to SSE service if available
    if (this.sseService) {
      const sseService = this.sseService;
      this.onBalanceChange((event) => {
        sseService.broadcastBalanceUpdate(event);
      });
    }
  }

  async startTrackingUser(request: BalanceTrackingRequest): Promise<void> {
    const { clientId, chainId, tokenAddresses, userAddress } = request;
    const key = this.getUserKey(chainId, userAddress);

    // Stop existing tracking if any
    await this.stopTrackingUser(chainId, userAddress);

    // Get initial balances
    // TODO: Maybe is not great that if this fails, the subscription is not done. This should be refined (hackathon mode)
    const initialBalances =
      await this.userBalanceRepository.getUserTokenBalances(
        chainId,
        userAddress,
        tokenAddresses
      );

    const lastBalances = new Map<string, UserTokenBalance>();
    initialBalances.forEach((balance) => {
      lastBalances.set(balance.tokenAddress.toLowerCase(), balance);
    });

    if (this.sseService) {
      this.sseService.broadcastInitialBalances(clientId, initialBalances);
    }

    // Start polling for changes
    // TODO: This is too simplistic implementation. Ideally we don't do an interval per subscription, but instead we have a general periodic check that updates all subscriptions. For now, lets keep simple, but would be nice to refine.
    const intervalId = setInterval(async () => {
      try {
        await this.checkBalanceChanges(
          chainId,
          userAddress,
          tokenAddresses,
          lastBalances
        );
      } catch (error) {
        logger.error(
          `[${intervalId}] Error checking balance changes for chainId=${chainId}, userAddress=${userAddress}, lastBalances=${lastBalances}:\n`,
          error
        );
      }
    }, POLLING_INTERVAL_MS);

    this.trackedUsers.set(key, {
      clientId,
      chainId,
      userAddress,
      tokenAddresses,
      lastBalances,
      intervalId,
    });

    logger.info(
      `Started tracking user ${userAddress} on chain ${chainId} for ${tokenAddresses.length} tokens. IntervalId=${intervalId}`
    );
  }

  async stopTrackingUser(
    chainId: SupportedChainId,
    userAddress: string
  ): Promise<void> {
    const key = this.getUserKey(chainId, userAddress);
    const trackedUser = this.trackedUsers.get(key);

    if (trackedUser) {
      clearInterval(trackedUser.intervalId);
      this.trackedUsers.delete(key);
      logger.info(`Stopped tracking user ${userAddress} on chain ${chainId}`);
    }
  }

  async getTrackedUsers(): Promise<Array<BalanceTrackingRequest>> {
    return Array.from(this.trackedUsers.values()).map(
      ({ clientId, chainId, userAddress, tokenAddresses }) => ({
        clientId,
        chainId,
        userAddress,
        tokenAddresses,
      })
    );
  }

  onBalanceChange(callback: BalanceChangeCallback): void {
    this.balanceChangeCallbacks.push(callback);
  }

  private async checkBalanceChanges(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[],
    lastBalances: Map<string, UserTokenBalance>
  ): Promise<void> {
    const currentBalances =
      await this.userBalanceRepository.getUserTokenBalances(
        chainId,
        userAddress,
        tokenAddresses
      );

    for (const currentBalance of currentBalances) {
      const tokenKey = currentBalance.tokenAddress.toLowerCase();
      const lastBalance = lastBalances.get(tokenKey);

      if (!lastBalance) {
        // New token balance
        lastBalances.set(tokenKey, currentBalance);
        continue;
      }

      // Check for balance changes
      if (lastBalance.balance !== currentBalance.balance) {
        const event: BalanceAllowanceChangeEvent = {
          type: 'balance_change',
          chainId,
          userAddress,
          tokenAddress: currentBalance.tokenAddress,
          oldBalance: lastBalance.balance,
          newBalance: currentBalance.balance,
          timestamp: Date.now(),
        };

        this.emitBalanceChange(event);
      }

      // Check for allowance changes (if both have allowance data)
      if (
        lastBalance.allowance &&
        currentBalance.allowance &&
        lastBalance.allowance !== currentBalance.allowance
      ) {
        const event: BalanceAllowanceChangeEvent = {
          type: 'allowance_change',
          chainId,
          userAddress,
          tokenAddress: currentBalance.tokenAddress,
          oldAllowance: lastBalance.allowance,
          newAllowance: currentBalance.allowance,
          timestamp: Date.now(),
        };

        this.emitBalanceChange(event);
      }

      // Update the last known balance
      lastBalances.set(tokenKey, currentBalance);
    }
  }

  private emitBalanceChange(event: BalanceAllowanceChangeEvent): void {
    this.balanceChangeCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Error in balance change callback:', error);
      }
    });
  }

  private getUserKey(chainId: SupportedChainId, userAddress: string): string {
    return `${chainId}:${userAddress.toLowerCase()}`;
  }
}
