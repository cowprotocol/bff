import { CacheRepositoryFactory } from './CacheRepositoryFactory';

export const cacheRepositorySymbol = Symbol.for('CacheRepository');

export interface CacheRepository {
  get(key: string): Promise<string | null>;
  getTtl(key: string): Promise<number | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
}

// Mock Cache Repository
class MockCacheRepository implements CacheRepository {
  private store: { [key: string]: { value: string; expiration: number } } = {};

  async get(key: string): Promise<string | null> {
    const item = this.store[key];
    if (!item || Date.now() > item.expiration) {
      return null;
    }
    return item.value;
  }

  async getTtl(key: string): Promise<number | null> {
    const item = this.store[key];
    if (!item) {
      return null;
    }
    const ttl = Math.max(0, Math.floor((item.expiration - Date.now()) / 1000));
    return ttl > 0 ? ttl : null;
  }

  async set(key: string, value: string, ttl: number): Promise<void> {
    this.store[key] = {
      value,
      expiration: Date.now() + ttl * 1000,
    };
  }
}

// Mock Repository Interface
interface MockRepository {
  getData(id: number): Promise<string | null>;
  getMultipleData(id: number, count: number): Promise<string[] | null>;
}

describe('GenericCacheRepository', () => {
  let mockRepo: jest.Mocked<MockRepository>;
  let cacheRepo: CacheRepository;
  let cachedRepo: MockRepository;

  beforeEach(() => {
    mockRepo = {
      getData: jest.fn(),
      getMultipleData: jest.fn(),
    };
    cacheRepo = new MockCacheRepository();
    cachedRepo = CacheRepositoryFactory.create<MockRepository>(
      mockRepo,
      cacheRepo,
      'test-cache',
      60, // Cache for 1 minute
      30 // Cache null for 30 seconds
    );
  });

  describe('getData', () => {
    it('should return data from cache if available', async () => {
      await cacheRepo.set('repos:test-cache:getData:123', '"cached-data"', 60);
      mockRepo.getData.mockResolvedValue('fresh-data');

      const result = await cachedRepo.getData(123);

      expect(result).toBe('cached-data');
      expect(mockRepo.getData).not.toHaveBeenCalled();
    });

    it('should call the repository and cache the result if not in cache', async () => {
      mockRepo.getData.mockResolvedValue('fresh-data');

      const result = await cachedRepo.getData(123);

      expect(result).toBe('fresh-data');
      expect(mockRepo.getData).toHaveBeenCalledWith(123);
      expect(await cacheRepo.get('repos:test-cache:getData:123')).toBe(
        '"fresh-data"'
      );
    });

    it('should cache null values', async () => {
      mockRepo.getData.mockResolvedValue(null);

      const result = await cachedRepo.getData(123);

      expect(result).toBeNull();
      expect(mockRepo.getData).toHaveBeenCalledWith(123);
      expect(await cacheRepo.get('repos:test-cache:getData:123')).toBe('null');
    });

    it('should set correct TTL for non-null values', async () => {
      mockRepo.getData.mockResolvedValue('fresh-data');

      await cachedRepo.getData(123);

      const ttl = await cacheRepo.getTtl('repos:test-cache:getData:123');
      expect(ttl).toBeGreaterThan(50); // Allow for some execution time
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should set correct TTL for null values', async () => {
      mockRepo.getData.mockResolvedValue(null);

      await cachedRepo.getData(123);

      const ttl = await cacheRepo.getTtl('repos:test-cache:getData:123');
      expect(ttl).toBeGreaterThan(20); // Allow for some execution time
      expect(ttl).toBeLessThanOrEqual(30);
    });

    it('should throw if the repository throws and there is no cache', async () => {
      mockRepo.getData.mockRejectedValue(new Error('Repository error'));

      await expect(cachedRepo.getData(123)).rejects.toThrow('Repository error');
    });
  });

  describe('getMultipleData', () => {
    it('should return data from cache if available', async () => {
      await cacheRepo.set(
        'repos:test-cache:getMultipleData:123:3',
        '["cached1","cached2","cached3"]',
        60
      );
      mockRepo.getMultipleData.mockResolvedValue([
        'fresh1',
        'fresh2',
        'fresh3',
      ]);

      const result = await cachedRepo.getMultipleData(123, 3);

      expect(result).toEqual(['cached1', 'cached2', 'cached3']);
      expect(mockRepo.getMultipleData).not.toHaveBeenCalled();
    });

    it('should call the repository and cache the result if not in cache', async () => {
      mockRepo.getMultipleData.mockResolvedValue([
        'fresh1',
        'fresh2',
        'fresh3',
      ]);

      const result = await cachedRepo.getMultipleData(123, 3);

      expect(result).toEqual(['fresh1', 'fresh2', 'fresh3']);
      expect(mockRepo.getMultipleData).toHaveBeenCalledWith(123, 3);
      expect(
        await cacheRepo.get('repos:test-cache:getMultipleData:123:3')
      ).toBe('["fresh1","fresh2","fresh3"]');
    });

    it('should cache null values', async () => {
      mockRepo.getMultipleData.mockResolvedValue(null);

      const result = await cachedRepo.getMultipleData(123, 3);

      expect(result).toBeNull();
      expect(mockRepo.getMultipleData).toHaveBeenCalledWith(123, 3);
      expect(
        await cacheRepo.get('repos:test-cache:getMultipleData:123:3')
      ).toBe('null');
    });

    it('should set correct TTL for non-null values', async () => {
      mockRepo.getMultipleData.mockResolvedValue([
        'fresh1',
        'fresh2',
        'fresh3',
      ]);

      await cachedRepo.getMultipleData(123, 3);

      const ttl = await cacheRepo.getTtl(
        'repos:test-cache:getMultipleData:123:3'
      );
      expect(ttl).toBeGreaterThan(50); // Allow for some execution time
      expect(ttl).toBeLessThanOrEqual(60);
    });

    it('should set correct TTL for null values', async () => {
      mockRepo.getMultipleData.mockResolvedValue(null);

      await cachedRepo.getMultipleData(123, 3);

      const ttl = await cacheRepo.getTtl(
        'repos:test-cache:getMultipleData:123:3'
      );
      expect(ttl).toBeGreaterThan(20); // Allow for some execution time
      expect(ttl).toBeLessThanOrEqual(30);
    });

    it('should throw if the repository throws and there is no cache', async () => {
      mockRepo.getMultipleData.mockRejectedValue(new Error('Repository error'));

      await expect(cachedRepo.getMultipleData(123, 3)).rejects.toThrow(
        'Repository error'
      );
    });
  });
});
