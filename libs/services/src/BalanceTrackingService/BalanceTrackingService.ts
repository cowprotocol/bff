import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { SSEClient } from '../SSEService/SSEService';

export const balanceTrackingServiceSymbol = Symbol.for(
  'BalanceTrackingService'
);

/**
 * Balance or allowance change event
 */
export type BalanceAllowanceChangeEvent =
  | BalanceChangeEvent
  | AllowanceChangeEvent;

export interface BalanceAllowanceChangeEventCommon {
  chainId: SupportedChainId;
  timestamp: number;
  userAddress: string;
  tokenAddress: string;
}

export interface BalanceChangeEvent extends BalanceAllowanceChangeEventCommon {
  type: 'balance_change';
  oldBalance: string;
  newBalance: string;
}

export interface AllowanceChangeEvent
  extends BalanceAllowanceChangeEventCommon {
  type: 'allowance_change';
  oldAllowance: string;
  newAllowance: string;
}

export type BalanceChangeCallback = (
  event: BalanceAllowanceChangeEvent
) => void;

export type BalanceTrackingRequest = Omit<SSEClient, 'send' | 'close'>;

/**
 * Service that keeps track of some user's balance and allowances, and notifies changes
 */
export interface BalanceTrackingService {
  /**
   * Starts tracking some user's balance and allowances for a list of tokens
   * @param chainId
   * @param userAddress
   * @param tokenAddresses List of tokens to monitor
   */
  startTrackingUser(request: BalanceTrackingRequest): Promise<void>;

  /**
   * Stops tracking some user's balances and allowances
   * @param chainId
   * @param userAddress
   */
  stopTrackingUser(
    chainId: SupportedChainId,
    userAddress: string
  ): Promise<void>;

  /**
   * Updates the list of tracked tokens for a user.
   * @param chainId
   * @param userAddress
   * @param tokenAddresses List of tokens to monitor
   */
  updateTrackedTokens(
    chainId: SupportedChainId,
    userAddress: string,
    tokenAddresses: string[]
  ): Promise<void>;

  /**
   * Get all users being tracked
   */
  getTrackedUsers(): Promise<Array<BalanceTrackingRequest>>;

  /**
   * Event triggered when there's a change on balance or allowance for a tracked user
   * @param callback
   */
  onBalanceChange(callback: BalanceChangeCallback): void;
}
