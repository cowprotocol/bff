import { Address, getAddress, isAddress } from 'viem';

export function parseEthereumAddressList(value: string[]): Address[] {
  const items = value;
  const unique = new Map<string, Address>();

  for (const item of items) {
    if (!item.trim()) {
      continue;
    }

    const checksummed = parseEthereumAddress(item);

    const key = checksummed.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, checksummed);
    }
  }

  return Array.from(unique.values());
}

export function parseEthereumAddress(value: string): Address {
  const trimmed = value.trim();
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid Ethereum address: ${trimmed}`);
  }

  return getAddress(trimmed);
}
