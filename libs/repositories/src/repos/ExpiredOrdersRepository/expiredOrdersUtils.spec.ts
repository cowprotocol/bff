import { OrderKind } from '@cowprotocol/cow-sdk'
import { ExpiredOrder } from './ExpiredOrdersRepository'
import { parseExpiredOrder } from './expiredOrdersUtils'

describe('parseExpiredOrder', () => {
  it('converts a binary custom recipient to an address', () => {
    const receiver = '0x0000000000000000000000000000000000000001'
    const order = {
      uid: Buffer.alloc(56),
      owner: Buffer.alloc(20),
      receiver: Buffer.from(receiver.slice(2), 'hex'),
      valid_to: 1,
      sell_token: Buffer.alloc(20),
      buy_token: Buffer.alloc(20),
      sell_amount: '1',
      buy_amount: '1',
      kind: OrderKind.SELL,
    } as unknown as ExpiredOrder

    expect(parseExpiredOrder(order)).toMatchObject({ receiver })
  })
})
