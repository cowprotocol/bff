import { Address, getAddress } from 'viem';
import { NativeCurrencyAddress, WrappedNativeTokenAddress } from './const';
import { SupportedChainId } from './types';

/**
 * Returns the token address. This function will throw if the address passed is not an Ethereum address.
 * It will also convert the address representing the native currency (0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE) into
 * its wrapped version.
 */
export function toTokenAddress(
  address: string,
  chainId: SupportedChainId
): Address {
  if (address.toLocaleLowerCase() === NativeCurrencyAddress) {
    return WrappedNativeTokenAddress[chainId];
  }

  return getAddress(address.toLowerCase());
}
