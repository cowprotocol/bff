import { AllChainIds } from '@cowprotocol/shared';

export const SupportedChainIdSchema = {
  title: 'Supported Chain ID',
  description: 'Supported Chain ID',
  enum: AllChainIds,
  type: 'integer',
} as const;

export const ChainIdOrSlugSchema = {
  title: 'Chain ID or Slug',
  description: 'Chain ID (integer) or chain slug (string)',
  type: 'string',
  pattern: '^(\\d{1,20})|([0-9a-z\\-]{3,30})$',
} as const;

export const AddressSchema = {
  title: 'Address',
  description: 'Ethereum address.',
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$',
} as const;

export const OptionalAddressSchema = {
  title: 'Optional Address',
  description:
    'Either provide a token address or a dash (-) to indicate no address.',
  oneOf: [
    {
      type: 'string',
      /**
       * Support not just EVM, but other address types as well.
       * Example of USDC addresses from Coingecko:
       * "platforms": {
       *     "ethereum": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
       *     "polkadot": "1337",
       *     "flow": "A.b19436aae4d94622.FiatToken",
       *     "avalanche": "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
       *     "optimistic-ethereum": "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
       *     "stellar": "USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
       *     "near-protocol": "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1",
       *     "hedera-hashgraph": "0.0.456858",
       *     "zksync": "0x1d17cbcf0d6d143135ae902365d2e5e2a16538d4",
       *     "tron": "TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8",
       *     "celo": "0xceba9300f2b948710d2653dd7b07f33a8b32118c",
       *     "arbitrum-one": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
       *     "base": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
       *     "polygon-pos": "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
       *     "solana": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
       *   }
       */
      pattern: '^[0x]?[a-fA-F0-9\\.:]{3,80}$',
    },
    {
      type: 'string',
      pattern: '^-$',
    },
  ],
} as const;

export const ETHEREUM_ADDRESS_PATTERN = '^0x[a-fA-F0-9]{40}$';
