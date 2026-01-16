import { Address, getAddress, isAddress } from 'viem';

export function parseEthereumAddressList(values: string[]): Address[] {
  const unique = new Set<Address>();

  for (const item of values) {
    if (!item.trim()) {
      continue;
    }

    unique.add(parseEthereumAddress(item));
  }

  return Array.from(unique);
}

export function parseEthereumAddress(value: string): Address {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid Ethereum address: ${trimmed}`);
  }

  return getAddress(trimmed);
}
