import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { Pool } from 'pg';

export type NotificationsIndexerState<T> = {
  key: string;
  chainId: number | null;
  state: T;
  created_at: Date;
  updated_at: Date;
};

export class NotificationsIndexerStateRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Get indexer state by key and optional chainId
   */
  async get<T>(
    key: string,
    chainId?: SupportedChainId
  ): Promise<NotificationsIndexerState<T> | null> {
    const query = `
      SELECT state 
      FROM notifications_indexer_state 
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
  async upsert(key: string, state: unknown, chainId?: number): Promise<void> {
    const query = `
      INSERT INTO notifications_indexer_state (key, chainId, state)
      VALUES ($1, $2, $3)
      ON CONFLICT (key, chainId) 
      DO UPDATE SET state = $3
    `;

    await this.db.query(query, [key, chainId, state]);
  }
}
