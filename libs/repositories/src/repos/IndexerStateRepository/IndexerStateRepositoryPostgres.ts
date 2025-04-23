import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Pool } from 'pg';
import { IndexerState, IndexerStateRepository } from './IndexerStateRepository';

export class IndexerStateRepositoryPostgres implements IndexerStateRepository {
  constructor(readonly db: Pool) {}

  /**
   * Get indexer state by key and optional chainId
   */
  async get<T>(
    key: string,
    chainId?: SupportedChainId
  ): Promise<IndexerState<T> | null> {
    const query = `
      SELECT state 
      FROM indexer_state 
      WHERE key = $1 
      ${chainId !== undefined ? 'AND chainId = $2' : ''}
      LIMIT 1
    `;
    const params = chainId !== undefined ? [key, chainId] : [key];

    const result = await this.db.query(query, params);
    return result.rows[0] || null;
  }

  /**
   * Update or insert indexer state
   */
  async upsert<T>(key: string, state: T, chainId?: number): Promise<void> {
    const query = `
      INSERT INTO indexer_state (key, chainId, state)
      VALUES ($1, $2, $3)
      ON CONFLICT (key, chainId) 
      DO UPDATE SET state = $3
    `;

    await this.db.query(query, [key, chainId, state]);
  }
}
