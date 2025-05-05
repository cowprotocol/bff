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
            result.transaction?.transaction_info.call_trace?.state_diff || []
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
    if (stateDiffList.length === 0) return [];

    const cumulativeStateDiff: StateDiff[][] = [];
    // This will store our accumulated state across all simulations
    const accumulatedStateDiff: StateDiff[] = [];

    for (let i = 0; i < stateDiffList.length; i++) {
      const stateDiffs = stateDiffList[i];

      // Process each diff in the current simulation
      for (let j = 0; j < stateDiffs.length; j++) {
        const diff = stateDiffs[j];

        // Handle regular diffs (with complete soltype, original, dirty data)
        if (diff?.soltype && diff?.original && diff?.dirty) {
          const diffKey = `${diff.address}-${diff.soltype.name}`;

          const existingIndex = accumulatedStateDiff.findIndex((item) => {
            if (!item.soltype) return false;
            return `${item.address}-${item.soltype.name}` === diffKey;
          });

          if (existingIndex === -1) {
            // New entry - add it to our accumulated state
            accumulatedStateDiff.push(structuredClone<typeof diff>(diff));
          } else {
            // Update existing entry - keep original values, update dirty values

            // Update dirty values
            accumulatedStateDiff[existingIndex].dirty = structuredClone<
              typeof diff.dirty
            >(diff.dirty);

            // Handle raw updates if present
            if (diff.raw) {
              if (!accumulatedStateDiff[existingIndex].raw) {
                accumulatedStateDiff[existingIndex].raw = structuredClone<
                  typeof diff.raw
                >(diff.raw);
              } else {
                // Update each raw element, preserving original values
                const updatedRaw = [...accumulatedStateDiff[existingIndex].raw];

                for (const rawElement of diff.raw) {
                  const idx = updatedRaw.findIndex(
                    (item) => item.key === rawElement.key
                  );

                  if (idx === -1) {
                    // New raw element
                    updatedRaw.push(
                      structuredClone<typeof rawElement>(rawElement)
                    );
                  } else {
                    // Update existing raw element - keep original, update dirty
                    updatedRaw[idx] = {
                      ...updatedRaw[idx],
                      dirty: rawElement.dirty,
                    };
                  }
                }

                accumulatedStateDiff[existingIndex].raw = updatedRaw;
              }
            }
          }
        }

        // Handle raw-only diffs (missing soltype, original, or dirty)
        else if (diff?.raw && diff.raw.length > 0) {
          for (const rawElement of diff.raw) {
            let updated = false;

            // First try to find and update existing entries
            for (let k = 0; k < accumulatedStateDiff.length; k++) {
              const stateDiff = accumulatedStateDiff[k];

              if (stateDiff.address === diff.address && stateDiff.raw) {
                const rawIndex = stateDiff.raw.findIndex(
                  (raw) => raw.key === rawElement.key
                );

                if (rawIndex !== -1) {
                  // Found matching raw element - update only dirty value
                  const newRaw = [...stateDiff.raw];
                  newRaw[rawIndex] = {
                    ...newRaw[rawIndex],
                    dirty: rawElement.dirty,
                  };

                  accumulatedStateDiff[k] = {
                    ...accumulatedStateDiff[k],
                    raw: newRaw,
                  };

                  updated = true;
                  break;
                }
              }
            }

            // If no existing entry was updated, create a new one
            if (!updated) {
              const newDiff: StateDiff = {
                address: diff.address,
                soltype: diff.soltype || null,
                original: diff.original || null,
                dirty: diff.dirty || null,
                raw: [structuredClone<typeof rawElement>(rawElement)],
              };

              accumulatedStateDiff.push(newDiff);
            }
          }
        }
      }

      // Add a deep copy of the current accumulated state to our results
      cumulativeStateDiff.push(
        structuredClone<typeof accumulatedStateDiff>(accumulatedStateDiff)
      );
    }

    return cumulativeStateDiff;
  }
}
