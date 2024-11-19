import { QuoteAmountsAndCosts } from '@cowprotocol/cow-sdk';

export function serializeQuoteAmountsAndCosts(value: QuoteAmountsAndCosts): QuoteAmountsAndCosts<string> {
  const { costs: { networkFee, partnerFee } } = value

  return {
    ...value,
    costs: {
      ...value.costs,
      networkFee: {
        ...networkFee,
        amountInSellCurrency: networkFee.amountInSellCurrency.toString(),
        amountInBuyCurrency: networkFee.amountInBuyCurrency.toString()
      },
      partnerFee: {
        ...partnerFee,
        amount: partnerFee.amount.toString()
      }
    },
    beforeNetworkCosts: serializeAmounts(value.beforeNetworkCosts),
    afterNetworkCosts: serializeAmounts(value.afterNetworkCosts),
    afterPartnerFees: serializeAmounts(value.afterPartnerFees),
    afterSlippage: serializeAmounts(value.afterSlippage)
  }
}

function serializeAmounts(value: {sellAmount: bigint; buyAmount: bigint}): {sellAmount: string; buyAmount: string} {
  return {
    sellAmount: value.sellAmount.toString(),
    buyAmount: value.buyAmount.toString()
  }
}
