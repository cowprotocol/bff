import {
  Erc20Repository,
  erc20RepositorySymbol,
} from '@cowprotocol/repositories';
import { EstimatedFillPrice, ValuePoint } from './types';
import BigNumber from 'bignumber.js';
import { apiContainer } from '../../../inversify.config';
import { SupportedChainId } from '@cowprotocol/cow-sdk';

export type GetEstimatedFillPricesParams = {
  chainId: SupportedChainId;
  sellToken: string;
  buyToken: string;
  orderGas: string; // We have: from API
  gasPricesGwei: ValuePoint[]; // We have (every 1min)

  sellTokenPriceInEthWei: ValuePoint[]; // TODO: Multiply price of token by gasPrice --> we get gas cost at a moment in time

  limitPrice: {
    sellAmount: string;
    buyAmount: string;
  };
};

export async function getEstimatedFillPrices(
  params: GetEstimatedFillPricesParams
): Promise<EstimatedFillPrice[]> {
  // console.log('params', {
  //   gasPricesGwei: params.gasPricesGwei[0],
  //   sellTokenPriceInEthWei: params.sellTokenPriceInEthWei[0],
  //   limitPrice: params.limitPrice,
  //   orderGas: params.orderGas,
  // });
  const {
    chainId,
    sellToken: sellTokenAddress,
    buyToken: buyTokenAddress,
    limitPrice,
    orderGas: orderGasString,
    gasPricesGwei,
    sellTokenPriceInEthWei,
  } = params;

  // Match closest points first
  const matchedPrices = matchClosestPrices(
    sellTokenPriceInEthWei,
    gasPricesGwei
  );

  // Calculate the decimal difference between the sell and buy token
  const erc20Repository: Erc20Repository = apiContainer.get(
    erc20RepositorySymbol
  );
  const sellToken = await erc20Repository.get(chainId, sellTokenAddress);
  const buyToken = await erc20Repository.get(chainId, buyTokenAddress);

  const sellTokenDecimals = sellToken?.decimals || 18;
  const buyTokenDecimals = buyToken?.decimals || 18;
  const tokenDecimalsDifference = sellTokenDecimals - buyTokenDecimals;

  // Print first 10 matched prices
  // console.log(
  //   'gasPricesGwei',
  //   gasPricesGwei
  //     .slice(0, 10)
  //     .map((p) => p.value)
  //     .join(', ')
  // );
  // console.log(
  //   'matchedPrices',
  //   matchedPrices
  //     .slice(0, 10)
  //     .map((p) => p.value)
  //     .join(', ')
  // );

  console.log(
    'gasPricesGwei times',
    new Date(gasPricesGwei[0].time).toISOString(),
    new Date(gasPricesGwei[gasPricesGwei.length - 1].time).toISOString()
  );
  console.log(
    'matchedPrices times',
    new Date(matchedPrices[0].time).toISOString(),
    new Date(matchedPrices[matchedPrices.length - 1].time).toISOString()
  );
  console.log(
    'sellTokenPriceInEthWei',
    new Date(sellTokenPriceInEthWei[0].time).toISOString(),
    new Date(
      sellTokenPriceInEthWei[sellTokenPriceInEthWei.length - 1].time
    ).toISOString()
  );

  // Process each matched point
  return matchedPrices.map((gasPrice, index) => {
    const tokenPriceInEthWei = sellTokenPriceInEthWei[index];

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
    const gasCostInSellToken = gasCostInWei.dividedBy(tokenPriceInEthWei.value);

    // Add gas cost to sell amount
    const sellAmountIncludingCost = gasCostInSellToken.plus(
      limitPrice.sellAmount
    );

    // Calculate the price (including costs)
    const priceIncludingCosts = sellAmountIncludingCost
      .dividedBy(10 ** tokenDecimalsDifference)
      .div(limitPrice.buyAmount);

    // if (index === 0) {
    //   console.log('data', {
    //     limitPrice,
    //     tokenPriceInEthWei,
    //     orderGasString,
    //     gasPrice: gasPrice.value,
    //     gasPriceInWei: gasPriceInWei.toString(),
    //     gasCostInWei: gasCostInWei.toString(),
    //     gasCostInSellToken: gasCostInSellToken.toString(),
    //     sellAmountIncludingCost: sellAmountIncludingCost.toString(),
    //     priceIncludingCosts: priceIncludingCosts.toString(),
    //   });
    // }

    return {
      time: tokenPriceInEthWei.time,
      fillPrice: priceIncludingCosts.toString(),
      gasPriceGwei: gasPrice.value,
      sellTokenPriceInEthWei: tokenPriceInEthWei.value,
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
