import { SupportedChainId } from '@cowprotocol/cow-sdk';
import { tokenListSearch } from './tokenListSearch';
import { TokenFromAPI } from './types';

describe('tokenListSearch', () => {
  const mockTokenMap: Record<string, TokenFromAPI[]> = {
    [SupportedChainId.MAINNET]: [
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xa0b86a33e6441d08b8b3f4b89b0e1e9b1b1c1d1e',
        name: 'Uniswap',
        symbol: 'UNI',
        decimals: 18,
        logoURI: 'https://example.com/uni.png',
      },
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
        name: 'Tether USD',
        symbol: 'USDT',
        decimals: 6,
        logoURI: 'https://example.com/usdt.png',
      },
      {
        chainId: SupportedChainId.MAINNET,
        address: '0x6b175474e89094c44da98b954eedeac495271d0f',
        name: 'Dai Stablecoin',
        symbol: 'DAI',
        decimals: 18,
        logoURI: 'https://example.com/dai.png',
      },
      {
        chainId: SupportedChainId.MAINNET,
        address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b',
        name: 'Cronos',
        symbol: 'CRO',
        decimals: 8,
        logoURI: 'https://example.com/cro.png',
      },
    ],
    [SupportedChainId.GNOSIS_CHAIN]: [
      {
        chainId: SupportedChainId.GNOSIS_CHAIN,
        address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
        name: 'Wrapped XDAI',
        symbol: 'WXDAI',
        decimals: 18,
        logoURI: 'https://example.com/wxdai.png',
      },
    ],
  };

  it('should filter tokens by name (case insensitive)', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'uni'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Uniswap');
    expect(result[0].symbol).toBe('UNI');
  });

  it('should filter tokens by symbol (case insensitive)', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'usdt'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tether USD');
    expect(result[0].symbol).toBe('USDT');
  });

  it('should filter tokens by address (case insensitive)', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      '0xdac17f958d2ee523a2206206994597c13d831ec7'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tether USD');
    expect(result[0].address).toBe(
      '0xdac17f958d2ee523a2206206994597c13d831ec7'
    );
  });

  it('should filter tokens by partial address (case insensitive)', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'dac17f'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tether USD');
  });

  it('should handle uppercase search params', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'DAI'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dai Stablecoin');
    expect(result[0].symbol).toBe('DAI');
  });

  it('should handle mixed case search params', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'StAbLe'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Dai Stablecoin');
  });

  it('should return multiple matches when search param matches multiple tokens', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'a0b'
    );

    expect(result).toHaveLength(2);
    expect(result.map((token) => token.symbol)).toContain('UNI');
    expect(result.map((token) => token.symbol)).toContain('CRO');
  });

  it('should return empty array when no matches found', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'nonexistent'
    );

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should filter tokens for the correct chain', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.GNOSIS_CHAIN,
      'wxdai'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Wrapped XDAI');
    expect(result[0].chainId).toBe(SupportedChainId.GNOSIS_CHAIN);
  });

  it('should not return tokens from other chains', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.GNOSIS_CHAIN,
      'uni'
    );

    expect(result).toHaveLength(0);
  });

  it('should handle empty search param', () => {
    const result = tokenListSearch(mockTokenMap, SupportedChainId.MAINNET, '');

    expect(result).toHaveLength(4);
    expect(result).toEqual(mockTokenMap[SupportedChainId.MAINNET]);
  });

  it('should handle whitespace in search param', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      '  dai  '
    );

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('DAI');
  });

  it('should match partial token names', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'tether'
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tether USD');
  });

  it('should match partial token symbols', () => {
    const result = tokenListSearch(
      mockTokenMap,
      SupportedChainId.MAINNET,
      'us'
    );

    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('USDT');
  });

  it('should handle chain with no tokens', () => {
    const emptyTokenMap: Record<string, TokenFromAPI[]> = {
      [SupportedChainId.SEPOLIA]: [],
    };

    const result = tokenListSearch(
      emptyTokenMap,
      SupportedChainId.SEPOLIA,
      'anything'
    );

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle special characters in search param', () => {
    const result = tokenListSearch(mockTokenMap, SupportedChainId.MAINNET, 'x');

    // Should match addresses containing 'x'
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every(
        (token) =>
          token.name.toLowerCase().includes('x') ||
          token.symbol.toLowerCase().includes('x') ||
          token.address.toLowerCase().includes('x')
      )
    ).toBe(true);
  });
});
