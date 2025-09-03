import {
  NATIVE_CURRENCY_ADDRESS,
  SupportedChainId,
  WRAPPED_NATIVE_CURRENCIES,
} from '@cowprotocol/cow-sdk';
import { Erc20RepositoryNative } from './Erc20RepositoryNative';

describe('Erc20RepositoryNative', () => {
  const repo = new Erc20RepositoryNative();

  it('returns wrapped native token info when given native sentinel address', async () => {
    const chainId = SupportedChainId.MAINNET;
    const result = await repo.get(chainId, NATIVE_CURRENCY_ADDRESS);

    expect(result).not.toBeNull();
    expect(result?.address).toEqual(NATIVE_CURRENCY_ADDRESS);
    expect(result?.symbol).toEqual('ETH');
    expect(result?.decimals).toEqual(18);
  });

  it('returns null for non-native addresses', async () => {
    const chainId = SupportedChainId.MAINNET;
    const nonNativeAddress = WRAPPED_NATIVE_CURRENCIES[chainId].address; // e.g. WETH address
    const result = await repo.get(chainId, nonNativeAddress);
    expect(result).toBeNull();
  });
});
