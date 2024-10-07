import {
  SupportedChainId,
  tenderlyRepositorySymbol,
  TenderlyRepository,
  SimulationInput,
  SimulationData,
} from '@cowprotocol/repositories';
import { injectable, inject } from 'inversify';

export const tenderlyServiceSymbol = Symbol.for('TenderlyServiceSymbol');

@injectable()
export class TenderlyService {
  constructor(
    @inject(tenderlyRepositorySymbol)
    private tenderlyRepository: TenderlyRepository
  ) {}

  async postTenderlyBundleSimulation(
    chainId: SupportedChainId,
    simulationInput: SimulationInput[]
  ): Promise<SimulationData[] | null> {
    return this.tenderlyRepository.postTenderlyBundleSimulation(
      chainId,
      simulationInput
    );
  }
}
