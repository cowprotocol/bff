import { SupportedChainId } from '@cowprotocol/cow-sdk';

/**
 * Indexer state.
 *
 * An indexer allows to track the state of a specific data source (for example, an API, DB or blockchain).
 *
 * The state is stored in a JSON object, so each indexer can define its own state schema.
 */
export type IndexerState<T = unknown> = {
  key: string;
  chainId: number | null;
  state: T;
  createdAt: Date;
  updatedAt: Date;
};

export type IndexerStateValue = Record<string, unknown>;

/**
 * Indexer state repository.
 *
 * This repository allows to store and retrieve the state of an indexer.
 */
export interface IndexerStateRepository {
  get<T extends IndexerStateValue>(
    key: string,
    chainId?: SupportedChainId
  ): Promise<IndexerState<T> | null>;

  upsert<T extends IndexerStateValue>(
    key: string,
    state: T,
    chainId?: number
  ): Promise<void>;
}
