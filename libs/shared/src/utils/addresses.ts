import { Address, getAddress, isAddress } from 'viem'

export function formatAccount(account: string): string {
  return `${account.slice(0, 6)}…${account.slice(-4)}`
}

export function parseEthereumAddressList(values: string[]): Address[] {
  const unique = new Set<Address>()

  for (const item of values) {
    if (!item.trim()) {
      continue
    }

    unique.add(parseEthereumAddress(item))
  }

  return Array.from(unique)
}

export function parseEthereumAddress(value: string): Address {
  const trimmed = value.trim()
  if (!isAddress(trimmed)) {
    throw new Error(`Invalid Ethereum address: ${trimmed}`)
  }

  return getAddress(trimmed)
}
