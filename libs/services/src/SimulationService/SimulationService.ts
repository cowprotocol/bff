import {
  SupportedChainId,
  tenderlyRepositorySymbol,
  SimulationRepository,
  SimulationInput,
  SimulationData,
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';

export const simulationServiceSymbol = Symbol.for('SimulationServiceSymbol');

@injectable()
export class SimulationService {
  constructor(
    @inject(tenderlyRepositorySymbol)
    private simulationRepository: SimulationRepository
  ) {}

  async postTenderlyBundleSimulation(
    chainId: SupportedChainId,
    simulationInput: SimulationInput[]
  ): Promise<SimulationData[] | null> {
    return this.simulationRepository.postBundleSimulation(
      chainId,
      simulationInput
    );
  }
}
