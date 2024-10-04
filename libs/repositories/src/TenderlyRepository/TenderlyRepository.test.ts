import { Container } from 'inversify';
import { TenderlyRepository } from './TenderlyRepository';
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

describe('TenderlyRepository', () => {
  let tenderlyRepository: TenderlyRepository;

  beforeAll(() => {
    const container = new Container();
    container
      .bind<TenderlyRepository>(TenderlyRepository)
      .to(TenderlyRepository);
    tenderlyRepository = container.get(TenderlyRepository);
    expect(TENDERLY_API_KEY).toBeDefined();
    expect(TENDERLY_ORG_NAME).toBeDefined();
    expect(TENDERLY_PROJECT_NAME).toBeDefined();
  });

  describe('getTopTokenHolders', () => {
    it('should return simulation data for success simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postTenderlyBundleSimulation(
          SupportedChainId.MAINNET,
          [TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeDefined();
      expect(tenderlySimulationResult?.length).toBe(1);
      expect(tenderlySimulationResult?.[0].status).toBeTruthy();
    }, 100000);

    it('should return null for invalid simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postTenderlyBundleSimulation(
          SupportedChainId.MAINNET,
          [INVALID_TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeNull();
    }, 100000);

    it('should return simulation data for failed simulation', async () => {
      const tenderlySimulationResult =
        await tenderlyRepository.postTenderlyBundleSimulation(
          SupportedChainId.MAINNET,
          [FAILED_TENDERLY_SIMULATION]
        );

      expect(tenderlySimulationResult).toBeDefined();
      expect(tenderlySimulationResult?.length).toBe(1);
      expect(tenderlySimulationResult?.[0].status).toBeFalsy();
    }, 100000);
  });
});
