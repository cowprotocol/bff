import { Erc20RepositoryViem } from './Erc20RepositoryViem';
import { SupportedChainId } from '@cowprotocol/shared';
import { PublicClient } from 'viem';
import { erc20Abi } from 'viem';
import { Erc20 } from './Erc20Repository';

const multicallMock = jest.fn();

// Mock implementation for PublicClient
const mockPublicClient: PublicClient = {
  multicall: multicallMock,

  // Add other methods of PublicClient if needed
} as unknown as jest.Mocked<PublicClient>;

export default mockPublicClient;

describe('Erc20RepositoryViem', () => {
  let erc20RepositoryViem: Erc20RepositoryViem;

  const chainId = SupportedChainId.MAINNET;
  const tokenAddress = '0x1111111111111111111111111111111111111111';
  const error = new Error('Multicall error');
  const erc20: Erc20 = {
    address: tokenAddress,
    name: 'Token Name',
    symbol: 'TKN',
    decimals: 18,
  };
  const expectedMulticallParams = {
    contracts: [
      { address: tokenAddress, abi: erc20Abi, functionName: 'totalSupply' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'name' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'symbol' },
      { address: tokenAddress, abi: erc20Abi, functionName: 'decimals' },
    ],
  };
  const viemClients = {
    [SupportedChainId.MAINNET]: mockPublicClient,
    [SupportedChainId.GNOSIS_CHAIN]: mockPublicClient,
    [SupportedChainId.ARBITRUM_ONE]: mockPublicClient,
    [SupportedChainId.SEPOLIA]: mockPublicClient,
  };

  beforeEach(() => {
    erc20RepositoryViem = new Erc20RepositoryViem(viemClients);
  });

  it('should return null if the address has no totalSupply (is not a ERC20)', async () => {
    // GIVEN: The address is not a ERC20. The multicall fails for totalSupply (and all other calls)
    multicallMock.mockResolvedValue([
      { error, status: 'failure' }, // totalSupply
      { error, status: 'failure' }, // name
      { error, status: 'failure' }, // symbol
      { error, status: 'failure' }, // decimals
    ]);

    // WHEN: get is called
    const result = await erc20RepositoryViem.get(chainId, tokenAddress);

    // THEN: Multicall called with the correct parameters
    expect(viemClients[chainId].multicall).toHaveBeenCalledWith(
      expectedMulticallParams
    );

    // THEN: The result is null
    expect(result).toBeNull();
  });

  it('should return Erc20 token details if address is an ERC20', async () => {
    // GIVEN: The address is a ERC20, but has no symbol or any other details
    multicallMock.mockResolvedValue([
      { result: 1234567, status: 'success' }, // totalSupply
      { error, status: 'failure' }, // name
      { error, status: 'failure' }, // symbol
      { error, status: 'failure' }, // decimals
    ]);

    // WHEN: get is called
    const result = await erc20RepositoryViem.get(chainId, tokenAddress);

    // THEN: Multicall called with the correct parameters
    expect(viemClients[chainId].multicall).toHaveBeenCalledWith(
      expectedMulticallParams
    );

    // THEN: The result is the token details
    expect(result).toEqual({
      address: tokenAddress,
      name: undefined,
      symbol: undefined,
      decimals: undefined,
    });
  });

  it('should return symbol if its the only optional method implemented', async () => {
    // GIVEN: The address is a ERC20, but has no symbol or any other details
    multicallMock.mockResolvedValue([
      { result: 1234567, status: 'success' }, // totalSupply
      { error, status: 'failure' }, // name
      { result: erc20.symbol, status: 'success' }, // symbol
      { error, status: 'failure' }, // decimals
    ]);

    // WHEN: get is called
    const result = await erc20RepositoryViem.get(chainId, tokenAddress);

    // THEN: Multicall called with the correct parameters
    expect(viemClients[chainId].multicall).toHaveBeenCalledWith(
      expectedMulticallParams
    );

    // THEN: The result is the token details
    expect(result).toEqual({
      address: tokenAddress,
      symbol: erc20.symbol,
      name: undefined,
      decimals: undefined,
    });
  });

  it('should return all ERC20 fields', async () => {
    // GIVEN: The address is a ERC20, but has no symbol or any other details
    multicallMock.mockResolvedValue([
      { result: 1234567, status: 'success' }, // totalSupply
      { result: erc20.name, status: 'success' }, // name
      { result: erc20.symbol, status: 'success' }, // symbol
      { result: erc20.decimals, status: 'success' }, // decimals
    ]);

    // WHEN: get is called
    const result = await erc20RepositoryViem.get(chainId, tokenAddress);

    // THEN: Multicall called with the correct parameters
    expect(viemClients[chainId].multicall).toHaveBeenCalledWith(
      expectedMulticallParams
    );

    // THEN: The result is the token details
    expect(result).toEqual(erc20);
  });

  it('should handle multicall errors', async () => {
    // GIVEN: The multicall throws an error
    multicallMock.mockRejectedValue(error);

    // WHEN: get is called
    const resultPromise = erc20RepositoryViem.get(chainId, tokenAddress);

    // THEN: Multicall called with the correct parameters
    expect(viemClients[chainId].multicall).toHaveBeenCalledWith(
      expectedMulticallParams
    );

    // THEN: The result should rethrow the original error
    expect(resultPromise).rejects.toThrowError(error);
  });
});
