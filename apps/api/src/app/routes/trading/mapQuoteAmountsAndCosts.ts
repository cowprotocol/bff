import { QuoteAmountsAndCosts, mapQuoteAmountsAndCosts } from '@cowprotocol/cow-sdk';

export function serializeQuoteAmountsAndCosts(value: QuoteAmountsAndCosts): QuoteAmountsAndCosts<string> {
  return mapQuoteAmountsAndCosts(value, String)
}

export function deserializeQuoteAmountsAndCosts(value: QuoteAmountsAndCosts<string>): QuoteAmountsAndCosts {
  return mapQuoteAmountsAndCosts(value, BigInt)
}
