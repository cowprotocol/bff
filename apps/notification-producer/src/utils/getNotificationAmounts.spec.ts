import { Erc20Repository } from '@cowprotocol/repositories'
import { SupportedChainId } from '@cowprotocol/cow-sdk'
import { getNotificationAmounts } from './getNotificationAmounts'

describe('getNotificationAmounts', () => {
  it('formats sell and buy amounts with their token symbols', async () => {
    const erc20Repository = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ address: '0xsell', decimals: 6, symbol: 'USDC' })
        .mockResolvedValueOnce({ address: '0xbuy', decimals: 18, symbol: 'COW' }),
    } as unknown as Erc20Repository

    await expect(
      getNotificationAmounts({
        chainId: SupportedChainId.MAINNET,
        isEthFlowOrder: false,
        erc20Repository,
        sellTokenAddress: '0xsell',
        buyTokenAddress: '0xbuy',
        sellAmount: 1_000_000n,
        buyAmount: 2_000_000_000_000_000_000n,
      })
    ).resolves.toEqual({ sell: '1 USDC', buy: '2 COW' })
  })
})
