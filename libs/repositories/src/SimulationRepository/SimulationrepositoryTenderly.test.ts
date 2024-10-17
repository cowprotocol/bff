import { Container } from 'inversify';
import { SimulationRepositoryTenderly } from './SimulationRepositoryTenderly';
import { SupportedChainId } from '@cowprotocol/shared';
import { WETH, NULL_ADDRESS } from '../../test/mock';
import {
  TENDERLY_API_KEY,
  TENDERLY_ORG_NAME,
  TENDERLY_PROJECT_NAME,
} from '../datasources/tenderlyApi';

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

  describe('getTopTokenHolders', () => {
    it('should return simulation data for success simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postBundleSimulation(
          SupportedChainId.MAINNET,
          [TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeDefined();
      expect(tenderlySimulationResult?.length).toBe(1);
      expect(tenderlySimulationResult?.[0].status).toBeTruthy();
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
    }, 100000);
  });
});
