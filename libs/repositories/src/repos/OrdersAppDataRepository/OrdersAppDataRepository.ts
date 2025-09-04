import { AnyAppDataDocVersion, SupportedChainId } from '@cowprotocol/cow-sdk';

export interface OrdersAppDataRepository {
  getAppDataForOrders(chainId: SupportedChainId, uids: string[]): Promise<Map<string, AnyAppDataDocVersion>>;
}
