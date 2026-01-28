import { parseEthereumAddress, parseEthereumAddressList } from './addresses';

describe('parseEthereumAddressList', () => {
  it('returns unique checksummed addresses from a comma list', () => {
    const input = [
      ' 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x0000000000000000000000000000000000000000 ',
    ];

    const result = parseEthereumAddressList(input);

    expect(result).toEqual([
      '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      '0x0000000000000000000000000000000000000000',
    ]);
  });

  it('ignores empty items and trims whitespace', () => {
    const input = [' ', '', '0x0000000000000000000000000000000000000000'];

    const result = parseEthereumAddressList(input);

    expect(result).toEqual(['0x0000000000000000000000000000000000000000']);
  });

  it('throws on invalid addresses', () => {
    expect(() => parseEthereumAddressList(['0x123'])).toThrow(
      'Invalid Ethereum address: 0x123'
    );
  });
});

describe('parseEthereumAddress', () => {
  it('returns the checksummed address', () => {
    const result = parseEthereumAddress(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    );

    expect(result).toBe('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2');
  });

  it('throws on invalid addresses', () => {
    expect(() => parseEthereumAddress('0x123')).toThrow(
      'Invalid Ethereum address: 0x123'
    );
  });
});
