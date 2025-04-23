import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { IndexerState as IndexerStateEntity } from '../../database/IndexerState.entity';
import { injectable } from 'inversify';
import { IndexerState, IndexerStateRepository } from './IndexerStateRepository';

@injectable()
export class IndexerStateRepositoryTypeOrm implements IndexerStateRepository {
  private repository: Repository<IndexerStateEntity>;

  constructor(dataSource: DataSource) {
    this.repository = dataSource.getRepository(IndexerStateEntity);
  }

  /**
   * Get indexer state by key and optional chainId
   */
  async get<T>(
    key: string,
    chainId?: SupportedChainId
  ): Promise<IndexerState<T> | null> {
    const result = await this.repository.findOne({
      where: {
        key,
        chainId: chainId === undefined ? null : chainId,
      } as FindOptionsWhere<IndexerStateEntity>,
    });

    if (!result) {
      return null;
    }

    const { state, createdAt, updatedAt } = result;

    return {
      key,
      chainId: chainId ?? null,
      state: state as any as T,
      createdAt,
      updatedAt,
    };
  }

  /**
   * Update or insert indexer state
   */
  async upsert<T>(key: string, state: T, chainId?: number): Promise<void> {
    const entity = this.repository.create({
      key,
      chainId: chainId ?? null,
      state: state as unknown as Record<string, unknown>,
    });

    await this.repository.save(entity);
  }
}
