import { ChainNames, toSupportedChainId } from '@cowprotocol/shared';
import fs from 'fs';
import path from 'path';
import { SlippageServiceMain } from './SlippageServiceMain';

const getUsdPrice = jest.fn();
const getUsdPrices = jest.fn();

/**
 * Test the SlippageService main implementation using realistic test data.
 * One difference between these tests and the ones in SlippageServiceMain.spec.ts is that in these tests we will use
 * real data for prices and USD we received from Coingecko and we save into test data files.
 *
 * These will allow to refine the slippage calculation algorithm to make it work well with real data.
 */
describe('SlippageServiceMain: Real test data', () => {
  let slippageService: SlippageServiceMain;

  // Read all files in test-data folder
  const testDataDir = path.join(__dirname, 'test-data');
  const testDataFiles = fs.readdirSync(testDataDir);

  for (const fileName of testDataFiles) {
    const {
      pair,
      baseToken: baseTokenAddress,
      quoteToken: quoteTokenAddress,
      chainId: chainIdValue,
      volatilityDetails,
      slippageBps,
    } = readTestFile(path.join(testDataDir, fileName));

    const chainId = toSupportedChainId(chainIdValue);
    const chainName = ChainNames[chainId];

    // Uncomment to tests a single pair
    // if (pair !== 'WETH-xDAI' || chainId !== SupportedChainId.GNOSIS_CHAIN)
    //   continue;

    test(`Expect ${chainName} ${pair} slippage to be ${slippageBps} BPS`, async () => {
      const {
        quoteToken: quoteTokenVolatilityDetails,
        baseToken: baseTokenVolatilityDetails,
      } = volatilityDetails;

      // GIVEN: USD price for the base and quote tokens
      getUsdPrice.mockImplementation(async (_chainId, tokenAddress) => {
        if (tokenAddress === baseTokenAddress) {
          return baseTokenVolatilityDetails.usdPrice;
        } else {
          return quoteTokenVolatilityDetails.usdPrice;
        }
      });

      // GIVEN: USD prices for the base and quote tokens
      getUsdPrices.mockImplementation(async (_chainId, tokenAddress) => {
        if (tokenAddress === baseTokenAddress) {
          return baseTokenVolatilityDetails.prices;
        } else {
          return quoteTokenVolatilityDetails.prices;
        }
      });

      // WHEN: Get the slippage
      const slippage = await slippageService.getSlippageBps({
        chainId,
        baseTokenAddress,
        quoteTokenAddress,
      });

      // THEN: The slippage should be as expected
      expect(slippage).toBe(slippageBps);
    });
  }

  beforeEach(() => {
    slippageService = new SlippageServiceMain({
      name: 'RealTestDataMock',
      getUsdPrice,
      getUsdPrices,
    });
  });
});

function readTestFile(filePath: string) {
  const testContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const volatilityDetails = testContent.volatilityDetails;

  volatilityDetails.quoteToken.prices =
    volatilityDetails.quoteToken.prices.map(fixDateForPrices);
  volatilityDetails.baseToken.prices =
    volatilityDetails.baseToken.prices.map(fixDateForPrices);

  return testContent;
}

function fixDateForPrices(price: any) {
  return {
    ...price,
    date: new Date(price.date),
  };
}
