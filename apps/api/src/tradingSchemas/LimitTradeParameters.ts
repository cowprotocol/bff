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
      "description": "ERC-20 token to be sold."
    },
    "sellTokenDecimals": {
      "type": "number"
    },
    "buyToken": {
      "type": "string",
      "description": "ERC-20 token to be bought."
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
      "type": "boolean",
      "description": "Is the order fill-or-kill or partially fillable?"
    },
    "slippageBps": {
      "type": "number",
      "description": "Slippage tolerance that was applied to the order to get the limit price. Expressed in Basis Points (BPS). One basis point is equivalent to 0.01% (1/100th of a percent)"
    },
    "receiver": {
      "anyOf": [
        {
          "type": "string",
          "description": "20 byte Ethereum address encoded as a hex with `0x` prefix."
        },
        {
          "type": "null"
        }
      ],
      "description": "An optional Ethereum address to receive the proceeds of the trade instead of the owner (i.e. the order signer)."
    },
    "validFor": {
      "type": "number",
      "description": "Unix timestamp (`uint32`) until which the order is valid."
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
      "type": "string",
      "description": "Amount of `sellToken` to be sold in atoms."
    },
    "buyAmount": {
      "type": "string",
      "description": "Amount of `buyToken` to be bought in atoms."
    },
    "quoteId": {
      "type": "number",
      "description": "Id of the quote to be used for the limit order."
    },
    "validTo": {
      "type": "number",
      "description": "Unix timestamp (`uint32`) until which the order is valid."
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