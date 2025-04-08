import { ValuePoint } from './types';
import BigNumber from 'bignumber.js';

export type GetEstimatedFillPricesParams = {
  orderGas: string; // We have: from API
  gasPrices: ValuePoint[]; // We have (every 1min)

  sellTokenPriceInEth: ValuePoint[]; // TODO: Multiply price of token by gasPrice --> we get gas cost at a moment in time

  limitPrice: {
    sellAmount: string;
    buyAmount: string;
  };
};

export async function getEstimatedFillPrices(
  params: GetEstimatedFillPricesParams
): Promise<ValuePoint[]> {
  const {
    limitPrice,
    orderGas: orderGasString,
    gasPrices,
    sellTokenPriceInEth,
  } = params;

  // Match closest points first
  const matchedPrices = matchClosestPrices(sellTokenPriceInEth, gasPrices);

  // Process each matched point
  return matchedPrices.map((gasPrice, index) => {
    const tokenPrice = sellTokenPriceInEth[index];

    // Gas price in weis per unit of gas
    // const gasPriceInWei = new BigNumber(gasPrice.value).multipliedBy(
    //   new BigNumber(1e9)
    // );

    // const gasCostInSellToken = new BigNumber(gasPrice.value)
    //   .multipliedBy(orderGasString)
    //   .dividedBy(tokenPrice.value)
    //   .dividedBy(new BigNumber(1e9)); // * 1e18 (to convert to weis) / 1e9 (cause is G

    // Get gas price in ETH (weis)
    const gasPriceInWei = new BigNumber(gasPrice.value).multipliedBy(1e9);

    // Calculate the costs in ETH (weis)
    const gasCostInWei = gasPriceInWei.multipliedBy(orderGasString);

    // Calculate the costs in the sell token (weis)
    const gasCostInSellToken = gasCostInWei.dividedBy(tokenPrice.value);

    // Add gas cost to sell amount
    const sellAmountIncludingCost = gasCostInSellToken.plus(
      limitPrice.sellAmount
    );

    // Calculate the price (including costs)
    const priceIncludingCosts = sellAmountIncludingCost.div(
      limitPrice.buyAmount
    );

    console.log('data', {
      limitPrice,
      tokenPrice,
      gasPrice: gasPrice.value,
      gasPriceInWei: gasPriceInWei.toString(),
      gasCostInWei: gasCostInWei.toString(),
      gasCostInSellToken: gasCostInSellToken.toString(),
      sellAmountIncludingCost: sellAmountIncludingCost.toString(),
      priceIncludingCosts: priceIncludingCosts.toString(),
    });

    return {
      time: tokenPrice.time,
      value: priceIncludingCosts.toString(),
    };
  });
}

function matchClosestPrices(
  tokenPrices: ValuePoint[],
  gasPrices: ValuePoint[]
): ValuePoint[] {
  const matched: ValuePoint[] = [];
  let gasIndex = 0;

  for (const tokenPrice of tokenPrices) {
    // Find the closest gas price point by moving forward until we pass the token price
    while (
      gasIndex < gasPrices.length - 1 &&
      Math.abs(gasPrices[gasIndex + 1].time - tokenPrice.time) <
        Math.abs(gasPrices[gasIndex].time - tokenPrice.time)
    ) {
      gasIndex++;
    }

    matched.push(gasPrices[gasIndex]);
  }

  return matched;
}
