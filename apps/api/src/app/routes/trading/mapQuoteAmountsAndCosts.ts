import { QuoteAmountsAndCosts } from '@cowprotocol/cow-sdk';

export function serializeQuoteAmountsAndCosts(value: QuoteAmountsAndCosts): QuoteAmountsAndCosts<string> {
  return mapQuoteAmountsAndCosts(value, String)
}

export function deserializeQuoteAmountsAndCosts(value: QuoteAmountsAndCosts<string>): QuoteAmountsAndCosts {
  return mapQuoteAmountsAndCosts(value, BigInt)
}

function mapQuoteAmountsAndCosts<T, R>(value: QuoteAmountsAndCosts<T>, mapper: (value: T) => R): QuoteAmountsAndCosts<R> {
  const { costs: { networkFee, partnerFee } } = value

  function serializeAmounts(value: {sellAmount: T; buyAmount: T}): {sellAmount: R; buyAmount: R} {
    return {
      sellAmount: mapper(value.sellAmount),
      buyAmount: mapper(value.buyAmount)
    }
  }

  return {
    ...value,
    costs: {
      ...value.costs,
      networkFee: {
        ...networkFee,
        amountInSellCurrency: mapper(networkFee.amountInSellCurrency),
        amountInBuyCurrency: mapper(networkFee.amountInBuyCurrency)
      },
      partnerFee: {
        ...partnerFee,
        amount: mapper(partnerFee.amount)
      }
    },
    beforeNetworkCosts: serializeAmounts(value.beforeNetworkCosts),
    afterNetworkCosts: serializeAmounts(value.afterNetworkCosts),
    afterPartnerFees: serializeAmounts(value.afterPartnerFees),
    afterSlippage: serializeAmounts(value.afterSlippage)
  }
}