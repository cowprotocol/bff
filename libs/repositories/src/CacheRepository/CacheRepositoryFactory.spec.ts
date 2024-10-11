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
// Mock Cache Repository

// Mock Repository Interface

interface Data {
  data: string;
  count: number;
}
interface MockRepository {
  getData(id: number): Promise<Data | null>;
  getFloat(id: number, id2: number): Promise<number | null>;
}

describe('GenericCacheRepository', () => {
  let mockRepo: jest.Mocked<MockRepository>;
  let cacheRepo: CacheRepository;
  let cachedRepo: MockRepository;

  beforeEach(() => {
    mockRepo = {
      getData: jest.fn(),
      getFloat: jest.fn(),
    };
    cacheRepo = new MockCacheRepository();
    cachedRepo = CacheRepositoryFactory.create<MockRepository>(
      mockRepo,
      cacheRepo,
      'test-cache',
      60, // Cache for 1 minute
      30, // Cache null for 30 seconds
      {
        getData: {
          serialize: (data) => JSON.stringify(data),
          deserialize: (data) => JSON.parse(data),
        },
        getFloat: {
          serialize: (data) => data.toString(),
          deserialize: (data) => parseFloat(data),
        },
      }
    );
  });

  const MOCK_DATA: Data = {
    data: 'data',
    count: 1,
  };
  const FLOAT_DATA = 1.234;

  const CACHED_DATA = JSON.stringify(MOCK_DATA);
  const FLOAT_CACHED_DATA = FLOAT_DATA.toString();

  describe('getData', () => {
    it('should return data from cache if available', async () => {
      await cacheRepo.set('repos:test-cache:getData:123', CACHED_DATA, 60);

      const result = await cachedRepo.getData(123);

      expect(result).toStrictEqual(MOCK_DATA);
      expect(mockRepo.getData).not.toHaveBeenCalled();
    });

    it('should call the repository and cache the result if not in cache', async () => {
      mockRepo.getData.mockResolvedValue(Promise.resolve(MOCK_DATA));

      const result = await cachedRepo.getData(123);

      expect(mockRepo.getData).toHaveBeenCalledWith(123);
      expect(result).toStrictEqual(MOCK_DATA);
      expect(await cacheRepo.get('repos:test-cache:getData:123')).toBe(
        CACHED_DATA
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
      mockRepo.getData.mockResolvedValue(MOCK_DATA);

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

  describe('getFloat', () => {
    it('should return data from cache if available', async () => {
      await cacheRepo.set(
        'repos:test-cache:getFloat:123:3',
        FLOAT_CACHED_DATA,
        60
      );

      const result = await cachedRepo.getFloat(123, 3);

      expect(result).toEqual(FLOAT_DATA);
      expect(mockRepo.getFloat).not.toHaveBeenCalled();
    });

    it('should call the repository and cache the result if not in cache', async () => {
      mockRepo.getFloat.mockResolvedValue(FLOAT_DATA);

      const result = await cachedRepo.getFloat(123, 3);

      expect(result).toEqual(FLOAT_DATA);
      expect(mockRepo.getFloat).toHaveBeenCalledWith(123, 3);
      expect(await cacheRepo.get('repos:test-cache:getFloat:123:3')).toBe(
        FLOAT_CACHED_DATA
      );
    });

    it('should cache null values', async () => {
      mockRepo.getFloat.mockResolvedValue(null);

      const result = await cachedRepo.getFloat(123, 3);

      expect(result).toBeNull();
      expect(mockRepo.getFloat).toHaveBeenCalledWith(123, 3);
      expect(await cacheRepo.get('repos:test-cache:getFloat:123:3')).toBe(
        'null'
      );
    });
  });
});