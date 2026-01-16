import { injectable, inject } from 'inversify';
import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { logger } from '@cowprotocol/shared';
import { UserTokenBalanceWithToken } from '../TokenBalancesService/TokenBalancesService';
import {
  BalanceTrackingService,
  BalanceAllowanceChangeEvent,
  BalanceChangeCallback,
  BalanceTrackingRequest,
} from './BalanceTrackingService';
import {
  TokenBalancesService,
  tokenBalancesServiceSymbol,
} from '../TokenBalancesService/TokenBalancesService';
import { SSEService, sseServiceSymbol } from '../SSEService/SSEService';

const POLLING_INTERVAL_MS = 5000; // 5 seconds // TODO: We should do this service more sophisticated. When a client subscribes, we poll more often, but because we want to use this is notifications, we might want to have other lower prio checking logics

export interface TrackedUser extends BalanceTrackingRequest {
  /**
   * Keep in memory the latest balances
   */
  lastBalances: Map<string, UserTokenBalanceWithToken>;

  /**
   * Interval ID to poll for changes
   */
  intervalId: NodeJS.Timeout;

  /**
   * Flag to indicate if the user is currently being checked
   */
  isChecking: boolean;
}

@injectable()
export class BalanceTrackingServiceMain implements BalanceTrackingService {
  private trackedUsers = new Map<string, TrackedUser>();
  private balanceChangeCallbacks: Array<BalanceChangeCallback> = [];

  constructor(
    @inject(tokenBalancesServiceSymbol)
    private tokenBalancesService: TokenBalancesService,
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

  private mergeBalanceTrackingRequest(
    request: BalanceTrackingRequest,
    balancesForTokens: UserTokenBalanceWithToken[]
  ): {
    trackedUser: TrackedUser;
    isNewTracking: boolean;
  } {
    const { clientId, chainId, tokenAddresses, userAddress } = request;
    const key = this.getUserKey(chainId, userAddress);
    const existingTrackedUser = this.trackedUsers.get(key);
    const normalizedTokenAddresses =
      this.normalizeTokenAddresses(tokenAddresses);

    if (existingTrackedUser) {
      // Merge token addresses (old tokens + new tokens)
      const mergedTokensToTrack = this.mergeTokenAddresses(
        existingTrackedUser.tokenAddresses,
        normalizedTokenAddresses
      );

      // Update the last known balances
      balancesForTokens.forEach((balance) => {
        existingTrackedUser.lastBalances.set(
          balance.token.address.toLowerCase(),
          balance
        );
      });
      existingTrackedUser.tokenAddresses = mergedTokensToTrack;

      return {
        trackedUser: existingTrackedUser,
        isNewTracking: false,
      };
    } else {
      const updatedLastBalances = new Map<string, UserTokenBalanceWithToken>();
      balancesForTokens.forEach((balance) => {
        updatedLastBalances.set(balance.token.address.toLowerCase(), balance);
      });

      const trackedUser: TrackedUser = {
        clientId,
        chainId,
        userAddress,
        tokenAddresses: normalizedTokenAddresses,
        lastBalances: updatedLastBalances,
        intervalId: undefined as unknown as NodeJS.Timeout,
        isChecking: false,
      };

      return {
        trackedUser,
        isNewTracking: true,
      };
    }
  }

  async startTrackingUser(request: BalanceTrackingRequest): Promise<void> {
    const { clientId, chainId, tokenAddresses, userAddress } = request;

    const normalizedTokenAddresses =
      this.normalizeTokenAddresses(tokenAddresses);

    // Get initial balances for this client
    // TODO: It is not great that if this fails, the subscription is not done. This should be refined (hackathon mode)
    const balancesForTokens =
      await this.tokenBalancesService.getUserTokenBalances({
        chainId,
        userAddress,
        tokenAddresses: normalizedTokenAddresses,
      });

    // Update the tracked user
    const { trackedUser, isNewTracking } = this.mergeBalanceTrackingRequest(
      request,
      balancesForTokens
    );

    // Broadcast the initial balances to the client
    if (this.sseService) {
      this.sseService.broadcastInitialBalances(clientId, balancesForTokens);
    }

    const key = this.getUserKey(chainId, userAddress);
    this.trackedUsers.set(key, trackedUser);

    if (isNewTracking) {
      logger.info(
        `Created new tracking for user ${userAddress} on chain ${chainId}. Tracking ${normalizedTokenAddresses.length} tokens`
      );

      // Start polling for changes
      const intervalId = this.startPollingForChanges(
        chainId,
        userAddress,
        trackedUser
      );
      trackedUser.intervalId = intervalId;
    } else {
      logger.info(
        `Updated tracking user ${userAddress} on chain ${chainId}. Tracking ${normalizedTokenAddresses.length} new tokens. Total tokens: ${trackedUser.tokenAddresses.length}`
      );
    }
  }

  private startPollingForChanges(
    chainId: SupportedChainId,
    userAddress: string,
    trackedUser: TrackedUser
  ): NodeJS.Timeout {
    // TODO: This is too simplistic implementation. Ideally we don't do an interval per subscription, but instead we have a general periodic check that updates all subscriptions. For now, lets keep simple, but would be nice to refine.
    const intervalId = setInterval(async () => {
      if (trackedUser.isChecking) {
        return;
      }

      trackedUser.isChecking = true;
      try {
        await this.checkBalanceChanges(
          chainId,
          userAddress,
          trackedUser.tokenAddresses,
          trackedUser.lastBalances
        );
      } catch (error) {
        logger.error(
          `[${intervalId}] Error checking balance changes for chainId=${chainId}, userAddress=${userAddress}, lastBalances=${trackedUser.lastBalances}:\n`,
          error
        );
      } finally {
        trackedUser.isChecking = false;
      }
    }, POLLING_INTERVAL_MS);

    logger.info(
      `Started tracking user ${userAddress} on chain ${chainId} for ${trackedUser.tokenAddresses.length} tokens. IntervalId=${intervalId}`
    );

    return intervalId;
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

  /**
   * Updates the list of tracked tokens for a user
   */
  async updateTrackedTokens(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<void> {
    const key = this.getUserKey(chainId, userAddress);
    const trackedUser = this.trackedUsers.get(key);
    if (!trackedUser) {
      return;
    }

    const normalizedTokenAddresses =
      this.normalizeTokenAddresses(tokenAddresses);

    const currentTokens = new Set(
      trackedUser.tokenAddresses.map((tokenAddress) =>
        tokenAddress.toLowerCase()
      )
    );
    const desiredTokens = new Set(normalizedTokenAddresses);
    const tokensToAdd = normalizedTokenAddresses.filter(
      (tokenAddress) => !currentTokens.has(tokenAddress)
    );
    logger.info(`New tracked token: ${tokensToAdd.join(',')}`);

    // Set the new list of tracked tokens
    trackedUser.tokenAddresses = normalizedTokenAddresses;

    // Delete balances for untracked tokens
    for (const tokenAddress of trackedUser.lastBalances.keys()) {
      if (!desiredTokens.has(tokenAddress)) {
        logger.info(`Stopping balance tracking for token: ${tokenAddress}`);
        trackedUser.lastBalances.delete(tokenAddress);
      }
    }

    // Update balances for new tokens
    if (tokensToAdd.length > 0) {
      const balancesForTokens =
        await this.tokenBalancesService.getUserTokenBalances({
          chainId,
          userAddress,
          tokenAddresses: tokensToAdd,
        });

      balancesForTokens.forEach((balance) => {
        trackedUser.lastBalances.set(
          balance.token.address.toLowerCase(),
          balance
        );
      });
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
    lastBalances: Map<string, UserTokenBalanceWithToken>
  ): Promise<void> {
    if (tokenAddresses.length === 0) {
      return;
    }

    const currentBalances =
      await this.tokenBalancesService.getUserTokenBalances({
        chainId,
        userAddress,
        tokenAddresses,
      });

    for (const currentBalance of currentBalances) {
      const tokenAddress = currentBalance.token.address;
      const tokenKey = tokenAddress.toLowerCase();
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
          tokenAddress: tokenAddress,
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
          tokenAddress: tokenAddress,
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

  /**
   * Normalize the token addresses to lowercase (also, removes duplicates)
   * @param tokenAddresses
   * @returns
   */
  private normalizeTokenAddresses(tokenAddresses: string[]): string[] {
    const unique = new Set<string>();
    tokenAddresses.forEach((address) => {
      unique.add(address.toLowerCase());
    });
    return Array.from(unique);
  }

  private mergeTokenAddresses(
    existing: string[],
    incoming: string[]
  ): string[] {
    const merged = new Set<string>(
      existing.map((address) => address.toLowerCase())
    );
    incoming.forEach((address) => {
      merged.add(address.toLowerCase());
    });
    return Array.from(merged);
  }
}
