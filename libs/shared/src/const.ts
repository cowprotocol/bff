import {
  ALL_SUPPORTED_CHAIN_IDS,
  ALL_SUPPORTED_CHAINS,
  SupportedChainId,
  WRAPPED_NATIVE_CURRENCIES,
} from '@cowprotocol/cow-sdk'
import { Address } from 'viem'

/**
 * Chain ids with CoW Protocol on-chain settlement infrastructure in this repo (RPC client, contract
 * addresses, orderbook DB replica, CoW API). Excludes Solana, which has none of that here.
 *
 * This does NOT mean Solana is unsupported by the repo in general: USD prices (via CoinGecko) and
 * price-impact/slippage estimation work for Solana through the general `SupportedChainId`/`AllChainIds`.
 * Only use this type for the specific EVM/on-chain infra it's scoped to (e.g. `EVM_CHAIN_IDS` below).
 */
export type EvmChainId = Exclude<SupportedChainId, SupportedChainId.SOLANA>

/**
 * Native currency address. For example, represents Ether in Mainnet and Arbitrum, and xDAI in Gnosis chain.
 */
export const NativeCurrencyAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'

/**
 * Wrapped native token address. For example, represents WETH in Mainnet and Arbitrum, and wxDAI in Gnosis chain.
 */
export const WrappedNativeTokenAddress: Record<SupportedChainId, Address> = Object.values(
  WRAPPED_NATIVE_CURRENCIES
).reduce((acc, curr) => {
  acc[curr.chainId as SupportedChainId] = curr.address as Address
  return acc
}, {} as Record<SupportedChainId, Address>)

export const ChainNames: Record<SupportedChainId, string> = Object.values(ALL_SUPPORTED_CHAINS).reduce((acc, curr) => {
  acc[curr.id as SupportedChainId] = curr.label
  return acc
}, {} as Record<SupportedChainId, string>)

// TODO: Get from SDK
export const EXPLORER_NETWORK_NAMES = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'gc',
  [SupportedChainId.ARBITRUM_ONE]: 'arb1',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'pol',
  [SupportedChainId.AVALANCHE]: 'avax',
  [SupportedChainId.BNB]: 'bnb',
  [SupportedChainId.LINEA]: 'linea',
  [SupportedChainId.PLASMA]: 'plasma',
  [SupportedChainId.INK]: 'ink',
  [SupportedChainId.SEPOLIA]: 'sepolia',
} as const satisfies Record<EvmChainId, string>

// TODO: Get from SDK
export const COW_API_NETWORK_NAMES = {
  [SupportedChainId.MAINNET]: 'mainnet',
  [SupportedChainId.GNOSIS_CHAIN]: 'xdai',
  [SupportedChainId.ARBITRUM_ONE]: 'arbitrum_one',
  [SupportedChainId.BASE]: 'base',
  [SupportedChainId.POLYGON]: 'polygon',
  [SupportedChainId.AVALANCHE]: 'avalanche',
  [SupportedChainId.BNB]: 'bnb',
  [SupportedChainId.LINEA]: 'linea',
  [SupportedChainId.PLASMA]: 'plasma',
  [SupportedChainId.INK]: 'ink',
  [SupportedChainId.SEPOLIA]: 'sepolia',
} as const satisfies Record<EvmChainId, string>

// All chains this repo generally knows about, including Solana (used e.g. for USD prices and price-impact estimation).
export const AllChainIds: SupportedChainId[] = ALL_SUPPORTED_CHAIN_IDS

// Chains with on-chain settlement infra in this repo (RPC client, contracts, orderbook DB, CoW API). No Solana.
export const EVM_CHAIN_IDS: EvmChainId[] = ALL_SUPPORTED_CHAIN_IDS.filter(
  (chainId): chainId is EvmChainId => chainId !== SupportedChainId.SOLANA
)
