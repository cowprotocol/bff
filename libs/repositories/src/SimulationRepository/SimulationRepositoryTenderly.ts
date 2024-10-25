import { SupportedChainId } from '@cowprotocol/shared';
import {
  AssetChange,
  SimulationError,
  TenderlyBundleSimulationResponse,
  TenderlySimulatePayload,
} from './tenderlyTypes';
import {
  getTenderlySimulationLink,
  TENDERLY_API_BASE_ENDPOINT,
  TENDERLY_API_KEY,
} from '../datasources/tenderlyApi';
import { injectable } from 'inversify';
import {
  SimulationData,
  SimulationInput,
  SimulationRepository,
} from './SimulationRepository';
import { BigNumber } from 'ethers';

export const tenderlyRepositorySymbol = Symbol.for('TenderlyRepository');

@injectable()
export class SimulationRepositoryTenderly implements SimulationRepository {
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

    const balancesDiff = this.buildBalancesDiff(
      response.simulation_results.map(
        (result) => result.transaction.transaction_info.asset_changes || []
      )
    );

    return response.simulation_results.map((simulation_result, i) => {
      return {
        status: simulation_result.simulation.status,
        id: simulation_result.simulation.id,
        link: getTenderlySimulationLink(simulation_result.simulation.id),
        cumulativeBalancesDiff: balancesDiff[i],
        gasUsed: simulation_result.transaction.gas_used.toString(),
      };
    });
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

        // Helper function to update balance
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
}
