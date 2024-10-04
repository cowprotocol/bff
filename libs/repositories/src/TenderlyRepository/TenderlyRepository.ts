import { SupportedChainId } from '@cowprotocol/shared';
import {
  SimulationData,
  SimulationError,
  SimulationInput,
  TenderlyBundleSimulationResponse,
  TenderlySimulatePayload,
} from './types';
import {
  getTenderlySimulationLink,
  TENDERLY_API_BASE_ENDPOINT,
  TENDERLY_API_KEY,
} from '../datasources/tenderlyApi';
import { injectable } from 'inversify';

export const tenderlyRepositorySymbol = Symbol.for('TenderlyRepository');

@injectable()
export class TenderlyRepository {
  async postTenderlyBundleSimulation(
    chainId: SupportedChainId,
    simulationsInput: SimulationInput[]
  ): Promise<SimulationData[] | null> {
    const simulations = simulationsInput.map((sim) => ({
      ...sim,
      network_id: chainId.toString(),
      gas_price: '0',
      save: true,
      save_if_fails: true,
    })) as TenderlySimulatePayload[];
    const response = (await fetch(
      `${TENDERLY_API_BASE_ENDPOINT}/simulate-bundle`,
      {
        method: 'POST',
        body: JSON.stringify({ simulations }),
        headers: {
          'X-Access-Key': TENDERLY_API_KEY,
        },
      }
    ).then((res) => res.json())) as
      | TenderlyBundleSimulationResponse
      | SimulationError;

    if (this.checkBundleSimulationError(response)) {
      return null;
    }

    // TODO: Add ERC20 state diffs
    return response.simulation_results.map(({ simulation }) => ({
      status: simulation.status,
      id: simulation.id,
      link: getTenderlySimulationLink(simulation.id),
    }));
  }

  checkBundleSimulationError(
    response: TenderlyBundleSimulationResponse | SimulationError
  ): response is SimulationError {
    return (response as SimulationError).error !== undefined;
  }
}
