import { AnyAppDataDocVersion } from '@cowprotocol/cow-sdk';

export function getOrderTitle(
  appData: AnyAppDataDocVersion | undefined,
  isPartiallyFillable: boolean
) {
  const { metadata } = appData || {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderClass = (metadata as any)?.orderClass?.orderClass || 'unknown';

  switch (orderClass) {
    case 'market':
      return 'Swap order filled';
    case 'limit':
      // TODO: for partially fillable orders, we need to check whether the order is fully filled/last fill
      return isPartiallyFillable
        ? 'Limit order partially filled'
        : 'Limit order filled';
    case 'liquidity':
      // No longer used, should never happen
      return 'Liquidity order filled';
    case 'twap':
      return 'TWAP part is filled';
    default:
      // Order class not properly configured
      return 'Order filled';
  }
}
