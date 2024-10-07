import { FallbackRepositoryFactory } from './FallbackRepositoryFactory';

// Simple repository interface
interface Repository {
  getData(): Promise<number | null>;
  getMultipleData(): Promise<number[] | null>;
}

// Mock implementations
class RepositoryMock_1_1 implements Repository {
  async getData() {
    return 1;
  }
  async getMultipleData() {
    return [1];
  }
}

class RepositoryMock_2_2 implements Repository {
  async getData() {
    return 2;
  }
  async getMultipleData() {
    return [2, 2];
  }
}

class RepositoryMock_null_3 implements Repository {
  async getData() {
    return null;
  }
  async getMultipleData() {
    return [3, 3, 3];
  }
}

class RepositoryMock_3_null implements Repository {
  async getData() {
    return 3;
  }
  async getMultipleData() {
    return null;
  }
}

class RepositoryMock_null_null implements Repository {
  async getData() {
    return null;
  }
  async getMultipleData() {
    return null;
  }
}

describe('FallbackRepositoryFactory', () => {
  describe('getData', () => {
    it('Returns first repo data when it is not null', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_1_1(),
        new RepositoryMock_2_2(),
      ]);

      const data = await fallbackRepo.getData();
      expect(data).toEqual(1);
    });

    it('Returns second repo data when first is null', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_null_3(),
        new RepositoryMock_1_1(),
      ]);

      const data = await fallbackRepo.getData();
      expect(data).toEqual(1);
    });

    it('Returns null when configured with no repositories', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([]);
      const data = await fallbackRepo.getData();
      expect(data).toEqual(null);
    });

    it('Returns null when no repo returns data', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_null_3(),
        new RepositoryMock_null_null(),
      ]);
      const data = await fallbackRepo.getData();
      expect(data).toEqual(null);
    });
  });

  describe('getMultipleData', () => {
    it('Returns first repo data when it is not null', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_1_1(),
        new RepositoryMock_2_2(),
      ]);

      const data = await fallbackRepo.getMultipleData();
      expect(data).toEqual([1]);
    });

    it('Returns second repo data when first is null', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_3_null(),
        new RepositoryMock_1_1(),
      ]);

      const data = await fallbackRepo.getMultipleData();
      expect(data).toEqual([1]);
    });

    it('Returns null when configured with no repositories', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([]);
      const data = await fallbackRepo.getMultipleData();
      expect(data).toEqual(null);
    });

    it('Returns null when no repo returns data', async () => {
      const fallbackRepo = FallbackRepositoryFactory.create<Repository>([
        new RepositoryMock_3_null(),
        new RepositoryMock_null_null(),
      ]);
      const data = await fallbackRepo.getMultipleData();
      expect(data).toEqual(null);
    });
  });
});
