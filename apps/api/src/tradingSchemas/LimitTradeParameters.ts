export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "buy",
        "sell"
      ],
      "description": "Is this order a buy or sell?"
    },
    "sellToken": {
      "type": "string",
      "description": "20 byte Ethereum address encoded as a hex with `0x` prefix."
    },
    "sellTokenDecimals": {
      "type": "number"
    },
    "buyToken": {
      "type": "string",
      "description": "20 byte Ethereum address encoded as a hex with `0x` prefix."
    },
    "buyTokenDecimals": {
      "type": "number"
    },
    "env": {
      "type": "string",
      "enum": [
        "prod",
        "staging"
      ],
      "description": "The environment to use for the Cow API."
    },
    "partiallyFillable": {
      "type": "boolean"
    },
    "slippageBps": {
      "type": "number"
    },
    "receiver": {
      "type": "string"
    },
    "validFor": {
      "type": "number"
    },
    "partnerFee": {
      "type": "object",
      "properties": {
        "bps": {
          "type": "number",
          "description": "The fee in basis points (BPS) to be paid to the partner. One basis point is equivalent to 0.01% (1/100th of a percent)"
        },
        "recipient": {
          "type": "string",
          "description": "The Ethereum address of the partner to receive the fee."
        }
      },
      "required": [
        "bps",
        "recipient"
      ],
      "additionalProperties": false
    },
    "sellAmount": {
      "type": "string"
    },
    "buyAmount": {
      "type": "string"
    },
    "quoteId": {
      "type": "number"
    },
    "validTo": {
      "type": "number"
    }
  },
  "required": [
    "buyAmount",
    "buyToken",
    "buyTokenDecimals",
    "kind",
    "quoteId",
    "sellAmount",
    "sellToken",
    "sellTokenDecimals"
  ],
  "additionalProperties": false,
  "definitions": {}
} as const