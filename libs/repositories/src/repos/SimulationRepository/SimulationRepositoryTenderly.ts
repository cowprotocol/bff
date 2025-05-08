import { logger, SupportedChainId } from '@cowprotocol/shared';
import {
  AssetChange,
  SimulationError,
  StateDiff,
  TenderlyBundleSimulationResponse,
  TenderlySimulatePayload,
} from './tenderlyTypes';
import {
  getTenderlySimulationLink,
  TENDERLY_API_BASE_ENDPOINT,
  TENDERLY_API_KEY,
} from '../../datasources/tenderlyApi';
import { injectable } from 'inversify';
import {
  SimulationData,
  SimulationInput,
  SimulationRepository,
} from './SimulationRepository';
import { BigNumber } from 'ethers';
import { buildStateDiff } from '../../utils/buildStateDiff';

interface TenderlyRequestLog {
  timestamp: string;
  chainId: SupportedChainId;
  endpoint: string;
  method: string;
  simulationsCount: number;
  simulations: TenderlySimulatePayload[];
}

interface TenderlyResponseLog {
  timestamp: string;
  duration: number;
  status: 'success' | 'error';
  error?: string;
  simulationResults?: {
    id: string;
    status: boolean;
    gasUsed?: string;
  }[];
}

export const tenderlyRepositorySymbol = Symbol.for('TenderlyRepository');

@injectable()
export class SimulationRepositoryTenderly implements SimulationRepository {
  private logRequest(
    chainId: SupportedChainId,
    simulations: TenderlySimulatePayload[]
  ): TenderlyRequestLog {
    const requestLog: TenderlyRequestLog = {
      timestamp: new Date().toISOString(),
      chainId,
      endpoint: `${TENDERLY_API_BASE_ENDPOINT}/simulate-bundle`,
      method: 'POST',
      simulationsCount: simulations.length,
      simulations,
    };

    logger.info({
      msg: 'Tenderly simulation request',
      ...requestLog,
    });

    return requestLog;
  }

  private logResponse(
    startTime: number,
    response: TenderlyBundleSimulationResponse | SimulationError
  ): TenderlyResponseLog {
    const duration = Date.now() - startTime;
    const responseLog: TenderlyResponseLog = {
      timestamp: new Date().toISOString(),
      duration,
      status: this.checkBundleSimulationError(response) ? 'error' : 'success',
    };

    if (this.checkBundleSimulationError(response)) {
      responseLog.error = response.error.message;
    } else {
      responseLog.simulationResults = response.simulation_results.map(
        (result) => ({
          id: result.simulation.id,
          status: result.simulation.status,
          gasUsed: result.transaction?.gas_used.toString(),
        })
      );
    }

    logger.info({
      msg: 'Tenderly simulation response',
      ...responseLog,
    });

    return responseLog;
  }

  async postBundleSimulation(
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

    const startTime = Date.now();
    this.logRequest(chainId, simulations);

    try {
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

      this.logResponse(startTime, response);

      if (this.checkBundleSimulationError(response)) {
        return null;
      }

      const balancesDiff = this.buildBalancesDiff(
        response.simulation_results.map(
          (result) => result.transaction?.transaction_info.asset_changes || []
        )
      );

      const stateDiff = this.buildStateDiff(
        response.simulation_results.map(
          (result) =>
            result.transaction?.transaction_info.call_trace?.state_diff ?? []
        )
      );

      return response.simulation_results.map((simulation_result, i) => {
        return {
          status: simulation_result.simulation.status,
          id: simulation_result.simulation.id,
          link: getTenderlySimulationLink(simulation_result.simulation.id),
          cumulativeBalancesDiff: balancesDiff[i],
          stateDiff: stateDiff[i],
          gasUsed: simulation_result.transaction?.gas_used.toString(),
        };
      });
    } catch (error) {
      logger.error({
        msg: 'Tenderly simulation unexpected error',
        error: error instanceof Error ? error.message : 'Unknown error',
        chainId,
        simulationsCount: simulations.length,
        duration: Date.now() - startTime,
      });
      throw error;
    }
  }

  checkBundleSimulationError(
    response: TenderlyBundleSimulationResponse | SimulationError
  ): response is SimulationError {
    return (response as SimulationError).error !== undefined;
  }

  buildBalancesDiff(
    assetChangesList: AssetChange[][]
  ): Record<string, Record<string, string>>[] {
    const cumulativeBalancesDiff: Record<string, Record<string, string>> = {};
    return assetChangesList.map((assetChanges) => {
      assetChanges.forEach((change) => {
        const { token_info, from, to, raw_amount } = change;
        const { contract_address } = token_info;

        const updateBalance = (
          address: string,
          tokenSymbol: string,
          changeAmount: string
        ) => {
          if (!cumulativeBalancesDiff[address]) {
            cumulativeBalancesDiff[address] = {};
          }
          if (!cumulativeBalancesDiff[address][tokenSymbol]) {
            cumulativeBalancesDiff[address][tokenSymbol] = '0';
          }
          const currentBalance = BigNumber.from(
            cumulativeBalancesDiff[address][tokenSymbol]
          );
          const changeValue = BigNumber.from(changeAmount);
          const newBalance = currentBalance.add(changeValue);
          cumulativeBalancesDiff[address][tokenSymbol] = newBalance.toString();
        };

        if (from) {
          updateBalance(from, contract_address, `-${raw_amount}`);
        }
        if (to) {
          updateBalance(to, contract_address, raw_amount);
        }
      });
      return structuredClone<typeof cumulativeBalancesDiff>(
        cumulativeBalancesDiff
      );
    });
  }

  buildStateDiff(stateDiffList: StateDiff[][]): StateDiff[][] {
    return buildStateDiff(stateDiffList);
  }
}
