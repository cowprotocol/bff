import { logger, SupportedChainId } from '@cowprotocol/shared';
import {
  AssetChange,
  RawElement,
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
            result.transaction?.transaction_info.call_trace.state_diff || []
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
      return JSON.parse(JSON.stringify(cumulativeBalancesDiff));
    });
  }

  buildStateDiff(stateDiffList: StateDiff[][]): StateDiff[][] {
    const cumulativeStateDiff: StateDiff[][] = [];
    const accumulatedStateDiff: StateDiff[] = [];
    // Object to track accumulated raw changes by address and key
    const accumulatedRawChanges: Record<
      string,
      Record<string, RawElement>
    > = {};

    for (const stateDiffs of stateDiffList) {
      for (const diff of stateDiffs) {
        // Skip diffs if soltype, original, or dirty is null
        if (!diff.soltype || diff.original === null || diff.dirty === null) {
          // Process the raw data anyway if it exists
          if (diff.raw) {
            const rawElements = Array.isArray(diff.raw) ? diff.raw : [diff.raw];

            for (const rawElement of rawElements) {
              const { address, key } = rawElement;

              // Initialize objects if they don't exist
              if (!accumulatedRawChanges[address]) {
                accumulatedRawChanges[address] = {};
              }

              if (!accumulatedRawChanges[address][key]) {
                accumulatedRawChanges[address][key] = {
                  address,
                  key,
                  original: rawElement.original,
                  dirty: rawElement.dirty,
                };
              } else {
                // Update only the dirty value, keep the original original
                accumulatedRawChanges[address][key].dirty = rawElement.dirty;
              }
            }
          }
          continue; // Skip the rest of the processing for this diff
        }

        // Process regular diffs where soltype, original, and dirty are not null
        const diffKey = `${diff.address}-${diff.soltype.name}`;

        const existingIndex = accumulatedStateDiff.findIndex((item) => {
          if (!item.soltype) return false;
          return `${item.address}-${item.soltype.name}` === diffKey;
        });

        if (existingIndex === -1) {
          accumulatedStateDiff.push({
            address: diff.address,
            soltype: diff.soltype,
            original: diff.original,
            dirty: diff.dirty,
            raw: diff.raw || [], // Initialize raw property
          });
        } else {
          accumulatedStateDiff[existingIndex] = {
            ...accumulatedStateDiff[existingIndex],
            dirty: diff.dirty,
          };
        }

        // Handle the raw changes
        if (diff.raw) {
          const rawElements = Array.isArray(diff.raw) ? diff.raw : [diff.raw];

          for (const rawElement of rawElements) {
            const { address, key } = rawElement;

            // Initialize objects if they don't exist
            if (!accumulatedRawChanges[address]) {
              accumulatedRawChanges[address] = {};
            }

            // For each raw change, we want to keep the original original value
            // but update the dirty value as changes accumulate
            if (!accumulatedRawChanges[address][key]) {
              accumulatedRawChanges[address][key] = {
                address,
                key,
                original: rawElement.original,
                dirty: rawElement.dirty,
              };
            } else {
              // Update only the dirty value, keep the original original
              accumulatedRawChanges[address][key].dirty = rawElement.dirty;
            }
          }
        }
      }

      // Update the raw arrays in accumulatedStateDiff with the latest from accumulatedRawChanges
      for (const diff of accumulatedStateDiff) {
        if (diff.address) {
          const addressChanges = accumulatedRawChanges[diff.address];
          if (addressChanges) {
            // Convert the object values to an array
            const rawArray = Object.values(addressChanges);
            if (rawArray.length > 0) {
              diff.raw = rawArray;
            }
          }
        }
      }

      // Create a deep copy of the accumulated state diff for this simulation
      cumulativeStateDiff.push(
        JSON.parse(JSON.stringify(accumulatedStateDiff))
      );
    }

    return JSON.parse(JSON.stringify(cumulativeStateDiff));
  }
}
