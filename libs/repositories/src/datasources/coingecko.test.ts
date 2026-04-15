import { getCoingeckoProClient } from './coingecko';

describe('getCoingeckoProClient', () => {
  const originalApiKey = process.env.COINGECKO_API_KEY;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.COINGECKO_API_KEY = originalApiKey;
  });

  afterAll(() => {
    process.env.COINGECKO_API_KEY = originalApiKey;
  });

  it('should create and return a client when COINGECKO_API_KEY is set', () => {
    const client = getCoingeckoProClient('test-api-key');

    expect(client).toBeDefined();
    expect(typeof client.GET).toBe('function');
    expect(typeof client.POST).toBe('function');
    expect(typeof client.PUT).toBe('function');
    expect(typeof client.DELETE).toBe('function');
  });

  it('should return the same client instance on subsequent calls (singleton pattern)', () => {
    const client1 = getCoingeckoProClient('test-api-key');
    const client2 = getCoingeckoProClient('test-api-key');

    expect(client1).toBe(client2);
  });

  it('should throw an error when COINGECKO_API_KEY is not set', () => {
    delete process.env.COINGECKO_API_KEY;

    expect(() => {
      getCoingeckoProClient();
    }).toThrow('COINGECKO_API_KEY is not set');
  });

  it('should throw an error when COINGECKO_API_KEY is empty string', () => {
    expect(() => {
      getCoingeckoProClient('');
    }).toThrow('COINGECKO_API_KEY is not set');
  });
});
