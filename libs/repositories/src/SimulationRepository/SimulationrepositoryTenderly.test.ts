import { Container } from 'inversify';
import { SimulationRepositoryTenderly } from './SimulationRepositoryTenderly';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH, NULL_ADDRESS } from '../../test/mock';
import {
  TENDERLY_API_KEY,
  TENDERLY_ORG_NAME,
  TENDERLY_PROJECT_NAME,
} from '../datasources/tenderlyApi';
import { AssetChange } from './tenderlyTypes';

// Transfering ETH from WETH to NULL ADDRESS
const TENDERLY_SIMULATION = {
  from: WETH,
  to: NULL_ADDRESS,
  value: '1000000000000000000',
  input: '0x',
};

const INVALID_TENDERLY_SIMULATION = {
  from: NULL_ADDRESS,
  to: WETH,
  value: '0',
  input: 'wrong input',
};

const FAILED_TENDERLY_SIMULATION = {
  from: NULL_ADDRESS,
  to: WETH,
  value: '0',
  input:
    '0x23b872dd000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000a',
};

describe('SimulationRepositoryTenderly', () => {
  let tenderlyRepository: SimulationRepositoryTenderly;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<SimulationRepositoryTenderly>(SimulationRepositoryTenderly)
      .to(SimulationRepositoryTenderly);
    tenderlyRepository = container.get(SimulationRepositoryTenderly);
    expect(TENDERLY_API_KEY).toBeDefined();
    expect(TENDERLY_ORG_NAME).toBeDefined();
    expect(TENDERLY_PROJECT_NAME).toBeDefined();
  });

  describe('postBundleSimulation', () => {
    it('should return simulation data for success simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postBundleSimulation(
          SupportedChainId.MAINNET,
          [TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeDefined();
      expect(tenderlySimulationResult?.length).toBe(1);
      expect(tenderlySimulationResult?.[0].status).toBeTruthy();
      expect(Number(tenderlySimulationResult?.[0].gasUsed)).toBeGreaterThan(0);
    }, 100000);

    it('should return null for invalid simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postBundleSimulation(
          SupportedChainId.MAINNET,
          [INVALID_TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeNull();
    }, 100000);

    it('should return simulation data for failed simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postBundleSimulation(
          SupportedChainId.MAINNET,
          [FAILED_TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeDefined();
      expect(tenderlySimulationResult?.length).toBe(1);
      expect(tenderlySimulationResult?.[0].status).toBeFalsy();
      expect(Number(tenderlySimulationResult?.[0].gasUsed)).toBeGreaterThan(0);
    }, 100000);
  });
  describe('buildBalancesDiff', () => {
    it('should correctly process a single asset change', () => {
      const input: AssetChange[][] = [
        [
          {
            token_info: {
              standard: 'ERC20',
              type: 'TOKEN',
              contract_address: '0x123',
              symbol: 'TEST',
              name: 'Test Token',
              logo: 'test.png',
              decimals: 18,
              dollar_value: '1.00',
            },
            type: 'TRANSFER',
            from: 'address1',
            to: 'address2',
            amount: '100',
            raw_amount: '100000000000000000000',
          },
        ],
      ];

      const expected = [
        {
          address1: {
            '0x123': '-100000000000000000000',
          },
          address2: {
            '0x123': '100000000000000000000',
          },
        },
      ];

      expect(tenderlyRepository.buildBalancesDiff(input)).toEqual(expected);
    });

    it('should correctly process multiple asset changes', () => {
      const input: AssetChange[][] = [
        [
          {
            token_info: {
              standard: 'ERC20',
              type: 'TOKEN',
              contract_address: '0x123',
              symbol: 'TEST',
              name: 'Test Token',
              logo: 'test.png',
              decimals: 18,
              dollar_value: '1.00',
            },
            type: 'TRANSFER',
            from: 'address1',
            to: 'address2',
            amount: '100',
            raw_amount: '100000000000000000000',
          },
        ],
        [
          {
            token_info: {
              standard: 'ERC20',
              type: 'TOKEN',
              contract_address: '0x456',
              symbol: 'TEST2',
              name: 'Test Token 2',
              logo: 'test2.png',
              decimals: 18,
              dollar_value: '2.00',
            },
            type: 'TRANSFER',
            from: 'address2',
            to: 'address3',
            amount: '50',
            raw_amount: '50000000000000000000',
          },
        ],
      ];

      const expected = [
        {
          address1: {
            '0x123': '-100000000000000000000',
          },
          address2: {
            '0x123': '100000000000000000000',
          },
        },
        {
          address1: {
            '0x123': '-100000000000000000000',
          },
          address2: {
            '0x123': '100000000000000000000',
            '0x456': '-50000000000000000000',
          },
          address3: {
            '0x456': '50000000000000000000',
          },
        },
      ];

      expect(tenderlyRepository.buildBalancesDiff(input)).toEqual(expected);
    });

    it('should handle empty input', () => {
      const input: AssetChange[][] = [];
      expect(tenderlyRepository.buildBalancesDiff(input)).toEqual([]);
    });

    it('should handle input with empty asset changes', () => {
      const input: AssetChange[][] = [[], []];
      expect(tenderlyRepository.buildBalancesDiff(input)).toEqual([{}, {}]);
    });

    it('should correctly handle cumulative changes', () => {
      const input: AssetChange[][] = [
        [
          {
            token_info: {
              standard: 'ERC20',
              type: 'TOKEN',
              contract_address: '0x123',
              symbol: 'TEST',
              name: 'Test Token',
              logo: 'test.png',
              decimals: 18,
              dollar_value: '1.00',
            },
            type: 'TRANSFER',
            from: 'address1',
            to: 'address2',
            amount: '100',
            raw_amount: '100000000000000000000',
          },
        ],
        [
          {
            token_info: {
              standard: 'ERC20',
              type: 'TOKEN',
              contract_address: '0x123',
              symbol: 'TEST',
              name: 'Test Token',
              logo: 'test.png',
              decimals: 18,
              dollar_value: '1.00',
            },
            type: 'TRANSFER',
            from: 'address2',
            to: 'address1',
            amount: '50',
            raw_amount: '50000000000000000000',
          },
        ],
      ];

      const expected = [
        {
          address1: {
            '0x123': '-100000000000000000000',
          },
          address2: {
            '0x123': '100000000000000000000',
          },
        },
        {
          address1: {
            '0x123': '-50000000000000000000',
          },
          address2: {
            '0x123': '50000000000000000000',
          },
        },
      ];

      expect(tenderlyRepository.buildBalancesDiff(input)).toEqual(expected);
    });
  });
});
