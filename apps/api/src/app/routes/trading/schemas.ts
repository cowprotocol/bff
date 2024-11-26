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
      title: 'ECDSA signature of the order',
      description: 'Result of eth_signTypedData_v4 with the orderTypedData',
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
    }
  }
} as const satisfies JSONSchema;