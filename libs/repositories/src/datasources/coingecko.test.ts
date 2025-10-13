import { getCoingeckoProClient } from './coingecko';

describe('getCoingeckoProClient', () => {
  beforeEach(() => {
    jest.resetModules();

    // Clear the singleton instance by re-requiring the module
    jest.clearAllMocks();

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