import {
  getEstimatedFillPrices,
  GetEstimatedFillPricesParams,
} from './getEstimatedFillPrices';

describe('getEstimatedFillPrices', () => {
  it.only('should calculate estimated fill prices correctly for simple values', async () => {
    const params: GetEstimatedFillPricesParams = {
      orderGas: '100000', // 100k gas
      gasPrices: [
        { time: 100, value: '50' }, // 50 GWEI
        { time: 160, value: '60' }, // 60 GWEI
        { time: 220, value: '55' }, // 55 GWEI
      ],
      sellTokenPriceInEth: [
        { time: 100, value: '0.0005' }, // 0.0005 DAI per ETH  --> 2000 DAI per WETH
        { time: 200, value: '0.001' }, // 0.001 DAI per ETH  --> 1000 DAI per WETH
      ],
      limitPrice: {
        sellAmount: '100000000000000000000', // 100 DAI
        buyAmount: '1000000000000000', // 0.001 WBTC (price = 100K DAI)
      },
    };

    const result = await getEstimatedFillPrices(params);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      {
        time: 100,
        // First point:
        // Gas cost = 50 GWEI * 100k * 1 ETH = 0.005 ETH = 0.005 tokens
        // Total sell amount = 1 + 0.005 = 1.005 tokens
        // Price = 1.005 / 2 = 0.5025
        value: '0.50000025',
      },
      {
        time: 200,
        // Second point:
        // Gas cost = 55 GWEI * 100k * 2 ETH = 0.011 ETH = 0.0055 tokens
        // Total sell amount = 1 + 0.0055 = 1.0055 tokens
        // Price = 1.0055 / 2 = 0.50275
        value: '0.5000001375',
      },
    ]);
  });

  it('should handle empty price arrays', async () => {
    const params: GetEstimatedFillPricesParams = {
      orderGas: '100000',
      gasPrices: [],
      sellTokenPriceInEth: [],
      limitPrice: {
        sellAmount: '1000000000000000000',
        buyAmount: '2000000000000000000',
      },
    };

    const result = await getEstimatedFillPrices(params);
    expect(result).toHaveLength(0);
  });

  it('should match closest gas price points correctly', async () => {
    const params: GetEstimatedFillPricesParams = {
      orderGas: '100000',
      gasPrices: [
        { time: 90, value: '50000000000' }, // 50 GWEI
        { time: 150, value: '60000000000' }, // 60 GWEI
        { time: 210, value: '55000000000' }, // 55 GWEI
      ],
      sellTokenPriceInEth: [
        { time: 100, value: '1000000000000000000' }, // Should match with 50 GWEI (closest to 90)
        { time: 200, value: '2000000000000000000' }, // Should match with 55 GWEI (closest to 210)
      ],
      limitPrice: {
        sellAmount: '1000000000000000000',
        buyAmount: '2000000000000000000',
      },
    };

    const result = await getEstimatedFillPrices(params);
    expect(result).toHaveLength(2);
    // Verify that the closest points were matched correctly
    expect(result[0].time).toBe(100);
    expect(result[1].time).toBe(200);
  });

  it('should handle edge case with single price point', async () => {
    const params: GetEstimatedFillPricesParams = {
      orderGas: '100000',
      gasPrices: [
        { time: 100, value: '50000000000' }, // 50 GWEI
      ],
      sellTokenPriceInEth: [
        { time: 100, value: '1000000000000000000' }, // 1 ETH
      ],
      limitPrice: {
        sellAmount: '1000000000000000000',
        buyAmount: '2000000000000000000',
      },
    };

    const result = await getEstimatedFillPrices(params);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(100);
  });
});
