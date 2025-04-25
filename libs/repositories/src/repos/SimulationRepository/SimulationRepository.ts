import { SupportedChainId } from '@cowprotocol/shared';
import { StateDiff } from './tenderlyTypes';

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
  // { [address: string]: { [token: string]: balanceDiff: string } }
  // example: { '0x123': { '0x456': '100', '0xabc': '-100' } }
  cumulativeBalancesDiff: Record<string, Record<string, string>>;
  stateDiff: StateDiff[];
  gasUsed?: string;
}

export const simulationRepositorySymbol = Symbol.for('SimulationRepository');

export interface SimulationRepository {
  postBundleSimulation(
    chainId: SupportedChainId,
    simulationsInput: SimulationInput[]
  ): Promise<SimulationData[] | null>;
}
