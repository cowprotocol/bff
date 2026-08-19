import { AnyAppDataDocVersion, OrderKind, SupportedChainId } from '@cowprotocol/cow-sdk'
import { Erc20Repository } from '@cowprotocol/repositories'
import { fromTradeToNotification } from './fromTradeToNotification'

describe('fromTradeToNotification', () => {
  it('uses the settlement timestamp and structured swap copy', async () => {
    const erc20Repository = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ address: '0xsell', decimals: 6, symbol: 'USDC' })
        .mockResolvedValueOnce({ address: '0xbuy', decimals: 18, symbol: 'COW' }),
    } as unknown as Erc20Repository

    await expect(
      fromTradeToNotification({
        prefix: 'test',
        id: 'trade-1',
        isEthFlowOrder: false,
        chainId: SupportedChainId.MAINNET,
        orderUid: `0x${'11'.repeat(56)}`,
        owner: '0x1234567890123456789012345678901234567890',
        sellTokenAddress: '0xsell',
        buyTokenAddress: '0xbuy',
        sellAmount: 1_000_000n,
        buyAmount: 2_000_000_000_000_000_000n,
        feeAmount: 0n,
        erc20Repository,
        transactionHash: `0x${'22'.repeat(32)}`,
        logIndex: 1,
        timestamp: 1_755_607_320n,
        order: {
          uid: `0x${'11'.repeat(56)}`,
          partiallyFillable: false,
          kind: OrderKind.SELL,
          sellAmount: '1000000',
          buyAmount: '2000000000000000000',
          executedSellAmount: '1000000',
          executedBuyAmount: '2000000000000000000',
        },
        appData: { metadata: { orderClass: { orderClass: 'market' } } } as AnyAppDataDocVersion,
      })
    ).resolves.toMatchObject({
      title: '✅ Swap filled at 12:42 UTC',
      message:
        'You traded 1 USDC and received 2 COW.\n\nAccount: 0x1234567890123456789012345678901234567890\nChain: Ethereum',
    })
  })
})
