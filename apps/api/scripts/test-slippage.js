const fs = require('fs');

const BASE_URL = 'http://localhost:3010';

const NetworkToChainId = {
  Mainnet: 1,
  'Gnosis Chain': 100,
  Arbitrum: 42161,
  Sepolia: 11155111,
};

const PAIRS_TEST = {
  Mainnet: [
    {
      pair: 'USDC-DAI',
      baseToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      quoteToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    {
      pair: 'DAI-ETH',
      baseToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      quoteToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
    {
      pair: 'DAI-WETH',
      baseToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      quoteToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    {
      pair: 'PEPE-DAI',
      baseToken: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      quoteToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    },
    {
      pair: 'PEPE-WETH',
      baseToken: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      quoteToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
    {
      pair: 'COW-WETH',
      baseToken: '0xDEf1CA1fb7FBcDC777520aa7f396b4E015F497aB',
      quoteToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    },
  ],
  'Gnosis Chain': [
    {
      pair: 'USDC-xDAI',
      baseToken: '0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83',
      quoteToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
    {
      pair: 'sDAI-xDAI',
      baseToken: '0xaf204776c7245bF4147c2612BF6e5972Ee483701',
      quoteToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
    {
      pair: 'sDAI-wxDAI',
      baseToken: '0xaf204776c7245bF4147c2612BF6e5972Ee483701',
      quoteToken: '0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d',
    },
    {
      pair: 'WETH-xDAI',
      baseToken: '0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1',
      quoteToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    },
  ],
  Arbitrum: [
    {
      pair: 'USDC-DAI',
      baseToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      quoteToken: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    },
    {
      pair: 'DAI-WETH',
      baseToken: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      quoteToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
    {
      pair: 'COW-WETH',
      baseToken: '0xcb8b5CD20BdCaea9a010aC1F8d835824F5C87A04',
      quoteToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    },
  ],
};

const fetchForMarket = async (chainId, quoteToken, baseToken, endpoint) => {
  const url = `${BASE_URL}/${chainId}/markets/${quoteToken}-${baseToken}/${endpoint}`;
  try {
    const response = await fetch(url);
    return response.json();
  } catch (error) {
    console.error(
      `Error fetching slippage tolerance for ${quoteToken}-${baseToken} on chain ${chainId}:`,
      error
    );
    return null;
  }
};

const fetchVolatilityDetails = async (pair, chainId, quoteToken, baseToken) => {
  return fetchForMarket(chainId, quoteToken, baseToken, 'volatilityDetails');
};

const fetchSlippageTolerance = async (pair, chainId, quoteToken, baseToken) => {
  return fetchForMarket(chainId, quoteToken, baseToken, 'slippageTolerance');
};

(async function () {
  for (const chain in PAIRS_TEST) {
    console.log(`\nFetching slippage tolerances for ${chain}:`);
    const chainId = NetworkToChainId[chain];
    for (const { pair, quoteToken, baseToken } of PAIRS_TEST[chain]) {
      const slippage = await fetchSlippageTolerance(
        pair,
        chainId,
        quoteToken,
        baseToken
      );
      const volatilityDetails = await fetchVolatilityDetails(
        pair,
        chainId,
        quoteToken,
        baseToken
      );

      if (!slippage) {
        console.error(`Error fetching slippage tolerance for ${pair}`);
        process.exit(1);
      }

      console.log(`${pair}: ${slippage.slippageBps}`);

      fs.writeFileSync(
        `${chainId}-${pair}.json`,
        JSON.stringify(
          {
            pair,
            chainId,
            baseToken,
            quoteToken,
            slippageBps: slippage ? slippage.slippageBps : null,
            volatilityDetails,
          },
          null,
          2
        )
      );
    }
  }
})();
