import { Container } from 'inversify';
import { SimulationRepositoryTenderly } from './SimulationRepositoryTenderly';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH, NULL_ADDRESS } from '../../../test/mock';
import {
  TENDERLY_API_KEY,
  TENDERLY_ORG_NAME,
  TENDERLY_PROJECT_NAME,
} from '../../datasources/tenderlyApi';
import { AssetChange, StateDiff } from './tenderlyTypes';

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

    it('should handle diffs with missing soltype', () => {
      const input: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: null,
            original: null,
            dirty: null,
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x0000',
                dirty: '0x0001',
              },
            ],
          },
        ],
      ];

      const expected: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: null,
            original: null,
            dirty: null,
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x0000',
                dirty: '0x0001',
              },
            ],
          },
        ],
      ];

      expect(tenderlyRepository.buildStateDiff(input)).toEqual(expected);
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
  describe('buildStateDiff', () => {
    it('should correctly process a single state diff', () => {
      const input: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1000',
              '0xdef': '2000',
            },
            dirty: {
              '0xabc': '1500',
              '0xdef': '1500',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1000',
                dirty: '0x1500',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x2000',
                dirty: '0x1500',
              },
            ],
          },
        ],
      ];

      const expected: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1000',
              '0xdef': '2000',
            },
            dirty: {
              '0xabc': '1500',
              '0xdef': '1500',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1000',
                dirty: '0x1500',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x2000',
                dirty: '0x1500',
              },
            ],
          },
        ],
      ];

      expect(tenderlyRepository.buildStateDiff(input)).toEqual(expected);
    });

    it('should accumulate state changes across multiple simulations', () => {
      const input: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1000',
              '0xdef': '2000',
            },
            dirty: {
              '0xabc': '1500',
              '0xdef': '1500',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1000',
                dirty: '0x1500',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x2000',
                dirty: '0x1500',
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1500',
              '0xdef': '1500',
            },
            dirty: {
              '0xabc': '2000',
              '0xdef': '1000',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1500',
                dirty: '0x2000',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x1500',
                dirty: '0x1000',
              },
            ],
          },
        ],
      ];

      const expected: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1000',
              '0xdef': '2000',
            },
            dirty: {
              '0xabc': '1500',
              '0xdef': '1500',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1000',
                dirty: '0x1500',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x2000',
                dirty: '0x1500',
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: {
              '0xabc': '1000',
              '0xdef': '2000',
            },
            dirty: {
              '0xabc': '2000',
              '0xdef': '1000',
            },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x1000',
                dirty: '0x2000',
              },
              {
                address: '0x123',
                key: '0xkey2',
                original: '0x2000',
                dirty: '0x1000',
              },
            ],
          },
        ],
      ];

      expect(tenderlyRepository.buildStateDiff(input)).toEqual(expected);
    });

    it('should process multiple addresses with different properties', () => {
      const input: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '200' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x100',
                dirty: '0x200',
              },
            ],
          },
          {
            address: '0x456',
            soltype: {
              name: 'allowed',
              type: 'mapping (address => mapping (address => uint256))',
              storage_location: 'storage',
              offset: 0,
              index: '0x001',
              indexed: false,
            },
            original: { '0xabc': { '0xdef': '1000' } },
            dirty: { '0xabc': { '0xdef': '500' } },
            raw: [
              {
                address: '0x456',
                key: '0xkey2',
                original: '0x1000',
                dirty: '0x500',
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '200' },
            dirty: { '0xabc': '300' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x200',
                dirty: '0x300',
              },
            ],
          },
        ],
      ];

      const expected: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '200' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x100',
                dirty: '0x200',
              },
            ],
          },
          {
            address: '0x456',
            soltype: {
              name: 'allowed',
              type: 'mapping (address => mapping (address => uint256))',
              storage_location: 'storage',
              offset: 0,
              index: '0x001',
              indexed: false,
            },
            original: { '0xabc': { '0xdef': '1000' } },
            dirty: { '0xabc': { '0xdef': '500' } },
            raw: [
              {
                address: '0x456',
                key: '0xkey2',
                original: '0x1000',
                dirty: '0x500',
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '300' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x100',
                dirty: '0x300',
              },
            ],
          },
          {
            address: '0x456',
            soltype: {
              name: 'allowed',
              type: 'mapping (address => mapping (address => uint256))',
              storage_location: 'storage',
              offset: 0,
              index: '0x001',
              indexed: false,
            },
            original: { '0xabc': { '0xdef': '1000' } },
            dirty: { '0xabc': { '0xdef': '500' } },
            raw: [
              {
                address: '0x456',
                key: '0xkey2',
                original: '0x1000',
                dirty: '0x500',
              },
            ],
          },
        ],
      ];

      expect(tenderlyRepository.buildStateDiff(input)).toEqual(expected);
    });

    it('should handle empty input', () => {
      const input: StateDiff[][] = [];
      expect(tenderlyRepository.buildStateDiff(input)).toEqual([]);
    });

    it('should handle input with empty state diffs', () => {
      const input: StateDiff[][] = [[], []];
      expect(tenderlyRepository.buildStateDiff(input)).toEqual([[], []]);
    });

    it('should correctly update raw elements when address and key match', () => {
      const input: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '200' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x0064', // hex for 100
                dirty: '0x00c8', // hex for 200
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: null,
            original: null,
            dirty: null,
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x00c8', // hex for 200
                dirty: '0x012c', // hex for 300
              },
            ],
          },
        ],
      ];

      // In the expected result, the accumulated state should maintain the original "original" value
      // but update the "dirty" value
      const expected: StateDiff[][] = [
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '200' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x0064',
                dirty: '0x00c8',
              },
            ],
          },
        ],
        [
          {
            address: '0x123',
            soltype: {
              name: 'balanceOf',
              type: 'mapping (address => uint256)',
              storage_location: 'storage',
              offset: 0,
              index: '0x000',
              indexed: false,
            },
            original: { '0xabc': '100' },
            dirty: { '0xabc': '200' },
            raw: [
              {
                address: '0x123',
                key: '0xkey1',
                original: '0x0064', // keeps the original original
                dirty: '0x012c', // updated with the latest dirty value
              },
            ],
          },
        ],
      ];

      expect(tenderlyRepository.buildStateDiff(input)).toEqual(expected);
    });
  });
});
