import { getAllSubscribedAccounts } from '@cowprotocol/cms-api';

const CACHE_TIME = 30000;

// TODO: Move to repositories and make a proper cached repository and use DI
export class SubscriptionRepository {
  private lastCheck: number | null = null;
  private cachedAccounts: string[] | null = null;

  async getAllSubscribedAccounts(): Promise<string[]> {
    const now = Date.now();
    if (!this.lastCheck || now - this.lastCheck > CACHE_TIME) {
      this.cachedAccounts = Array.from(
        new Set(await getAllSubscribedAccounts())
      );
      this.lastCheck = now;
      return this.cachedAccounts;
    }
    return this.cachedAccounts || [];
  }
}
