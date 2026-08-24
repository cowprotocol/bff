import { ORDER_EXPIRATION_THRESHOLD_SECONDS } from '@cowprotocol/repositories'
import { getExpirationCheckTimestamp } from './ExpiredOrdersNotificationProducer'

describe('getExpirationCheckTimestamp', () => {
  it('ends the next cursor at the delayed expiry-query boundary', () => {
    expect(getExpirationCheckTimestamp(1_000)).toBe(1_000 - ORDER_EXPIRATION_THRESHOLD_SECONDS)
  })
})
