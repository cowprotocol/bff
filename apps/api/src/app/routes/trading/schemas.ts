import { JSONSchema } from 'json-schema-to-ts';

import { omit } from '@cowprotocol/shared';

import QuoterParametersSchema from '../../../tradingSchemas/QuoterParameters';
import TradeParametersSchema from '../../../tradingSchemas/TradeParameters';
import QuoteResultsSchema from '../../../tradingSchemas/QuoteResultsSerialized';
import SwapAdvancedSettings from '../../../tradingSchemas/SwapAdvancedSettings';
import { SigningScheme } from '@cowprotocol/cow-sdk';

const QuoteIdSchema = {
  title: 'Quote ID',
  description: 'Unique identifier of the quote.',
  type: 'number'
} as const

const TraderParametersSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    env: TradeParametersSchema.properties.env,
    chainId: QuoterParametersSchema.properties.chainId,
    account: QuoterParametersSchema.properties.account,
  },
  required: [
    'chainId',
    'account'
  ]
} as const

const TransactionSchema = {
  type: 'object',
  required: ['data', 'gas', 'to', 'value'],
  additionalProperties: false,
  properties: {
    data: {
      title: 'Smart-contract call data',
      type: 'string'
    },
    gas: {
      title: 'Gas limit',
      type: 'string'
    },
    to: {
      title: 'CoW Protocol Settlement contract address',
      type: 'string'
    },
    value: {
      title: 'Native token value to send',
      type: 'string'
    },
  }
} as const

export const getQuoteBodySchema = {
  type: 'object',
  required: ['trader', 'params'],
  additionalProperties: false,
  properties: {
    trader: {
      ...QuoterParametersSchema,
      title: 'Information about the trader',
    },
    params: {
      ...TradeParametersSchema,
      properties: omit(TradeParametersSchema.properties, ['sellTokenDecimals', 'buyTokenDecimals']),
      required: [
        'amount',
        'kind',
        'sellToken',
        'buyToken',
      ]
    },
    advancedSettings: {
      ...SwapAdvancedSettings,

    }
  }
} as const satisfies JSONSchema;

export const getQuoteSuccessSchema = QuoteResultsSchema;

export const errorSchema = {
  type: 'object',
  required: ['message'],
  additionalProperties: false,
  properties: {
    message: {
      title: 'Message',
      description: 'Message describing the error.',
      type: 'string'
    }
  }
} as const satisfies JSONSchema;

export const postOrderBodySchema = {
  type: 'object',
  required: ['trader', 'quoteId', 'orderToSign', 'appDataInfo', 'signingScheme'],
  additionalProperties: false,
  properties: {
    trader: TraderParametersSchema,
    quoteId: QuoteIdSchema,
    orderToSign: QuoteResultsSchema.properties.orderToSign,
    appDataInfo: QuoteResultsSchema.properties.appDataInfo,
    signingScheme: {
      type: 'string',
      enum: Object.values(SigningScheme),
      title: 'Signing scheme',
      description: 'Signing scheme used to sign the order.',
      default: SigningScheme.EIP712,
    },
    signature: {
      title: 'ECDSA signature of the order OR account address for smart-contracts',
      description: 'Result of eth_signTypedData_v4 with the orderTypedData OR the account address for smart-contracts (pre-sign)',
      type: 'string'
    }
  }
} as const satisfies JSONSchema;

export const postOrderSuccessSchema = {
  type: 'object',
  required: ['orderId'],
  additionalProperties: false,
  properties: {
    orderId: {
      title: 'Order ID',
      description: 'Unique identifier for the order, you can search for details of the order in https://explorer.cow.fi using the ID.',
      type: 'string'
    },
    preSignTransaction: {
      ...TransactionSchema,
      properties: {
        ...TransactionSchema.properties,
        value: {
          ...TransactionSchema.properties.value,
          const: '0'
        }
      },
      description: 'For smart-contracts, the transaction to be sent to the CoW Protocol Settlement contract to confirm the order.',
    }
  }
} as const satisfies JSONSchema;


export const ethFlowTxBodySchema = {
  type: 'object',
  required: ['trader', 'tradeParameters', 'quoteId', 'amountsAndCosts', 'appDataInfo'],
  additionalProperties: false,
  properties: {
    trader: TraderParametersSchema,
    tradeParameters: TradeParametersSchema,
    quoteId: QuoteIdSchema,
    amountsAndCosts: QuoteResultsSchema.properties.amountsAndCosts,
    appDataInfo: QuoteResultsSchema.properties.appDataInfo,
  }
} as const satisfies JSONSchema;

export const ethFlowTxSuccessSchema = {
  type: 'object',
  required: ['orderId', 'transaction'],
  additionalProperties: false,
  properties: {
    orderId: {
      title: 'Order ID',
      description: 'Unique identifier for the order, you can search for details of the order in https://explorer.cow.fi using the ID.',
      type: 'string'
    },
    transaction: {
      ...TransactionSchema,
      description: 'Transaction to be sent to the CoW Protocol Eth-flow contract to create the order.',
    }
  }
} as const satisfies JSONSchema;