import { JSONSchema } from 'json-schema-to-ts';

import { omit } from '@cowprotocol/shared';

import QuoterParametersSchema from '../../../tradingSchemas/QuoterParameters';
import TradeParametersSchema from '../../../tradingSchemas/TradeParameters';
import QuoteResultsSchema from '../../../tradingSchemas/QuoteResultsSerialized';

export const getQuoteBodySchema = {
  type: 'object',
  required: ['trader', 'params'],
  additionalProperties: false,
  properties: {
    trader: QuoterParametersSchema,
    params: {
      ...TradeParametersSchema,
      properties: omit(TradeParametersSchema.properties, ['sellTokenDecimals', 'buyTokenDecimals']),
      required: [
        'amount',
        'kind',
        'sellToken',
        'buyToken',
      ]
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
  required: ['trader', 'quoteResponse', 'orderTypedData', 'appDataInfo', 'signature'],
  additionalProperties: false,
  properties: {
    trader: {
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
    },
    quoteResponse: QuoteResultsSchema.properties.quoteResponse,
    orderTypedData: QuoteResultsSchema.properties.orderTypedData,
    appDataInfo: QuoteResultsSchema.properties.appDataInfo,
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
      type: 'object',
      description: 'For smart-contracts, the transaction to be sent to the CoW Protocol Settlement contract to confirm the order.',
      required: ['callData', 'gasLimit', 'to', 'value'],
      additionalProperties: false,
      properties: {
        callData: {
          title: 'Call data',
          type: 'string'
        },
        gasLimit: {
          title: 'Gas limit',
          type: 'string'
        },
        to: {
          title: 'CoW Protocol Settlement contract address',
          type: 'string'
        },
        value: {
          title: 'Native token value to send',
          type: 'string',
          const: '0'
        },
      }
    }
  }
} as const satisfies JSONSchema;