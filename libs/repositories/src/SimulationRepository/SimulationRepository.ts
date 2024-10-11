import { SupportedChainId } from '@cowprotocol/shared';

export interface SimulationInput {
  input: string;
  from: string;
  to: string;
  value?: string;
  gas?: number;
  gas_price?: string;
}

export interface SimulationData {
  link: string;
  status: boolean;
  id: string;
}

export const simulationRepositorySymbol = Symbol.for('SimulationRepository');

export interface SimulationRepository {
  postBundleSimulation(
    chainId: SupportedChainId,
    simulationsInput: SimulationInput[]
  ): Promise<SimulationData[] | null>;
}
