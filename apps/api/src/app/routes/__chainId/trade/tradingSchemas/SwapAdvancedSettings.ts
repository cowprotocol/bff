export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "quoteRequest": {
      "type": "object",
      "properties": {
        "sellAmountBeforeFee": {
          "type": "string",
          "description": "The total amount that is available for the order. From this value, the fee is deducted and the buy amount is calculated."
        },
        "validTo": {
          "type": "number",
          "description": "Unix timestamp (`uint32`) until which the order is valid."
        },
        "sellToken": {
          "type": "string",
          "description": "ERC-20 token to be sold"
        },
        "buyToken": {
          "type": "string",
          "description": "ERC-20 token to be bought"
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
          "description": "An optional address to receive the proceeds of the trade instead of the `owner` (i.e. the order signer)."
        },
        "appData": {
          "anyOf": [
            {
              "type": "string",
              "description": "The string encoding of a JSON object representing some `appData`. The format of the JSON expected in the `appData` field is defined [here](https://github.com/cowprotocol/app-data)."
            },
            {
              "type": "string",
              "description": "32 bytes encoded as hex with `0x` prefix. It's expected to be the hash of the stringified JSON object representing the `appData`."
            }
          ],
          "description": "AppData which will be assigned to the order. Expects either a string JSON doc as defined on [AppData](https://github.com/cowprotocol/app-data) or a hex encoded string for backwards compatibility. When the first format is used, it's possible to provide the derived appDataHash field."
        },
        "appDataHash": {
          "type": "string",
          "description": "The hash of the stringified JSON appData doc. If present, `appData` field must be set with the aforementioned data where this hash is derived from. In case they differ, the call will fail."
        },
        "sellTokenBalance": {
          "type": "string",
          "enum": [
            "erc20",
            "internal",
            "external"
          ],
          "description": "Where should the `sellToken` be drawn from?"
        },
        "buyTokenBalance": {
          "type": "string",
          "enum": [
            "erc20",
            "internal"
          ],
          "description": "Where should the `buyToken` be transferred to?"
        },
        "from": {
          "type": "string",
          "description": "20 byte Ethereum address encoded as a hex with `0x` prefix."
        },
        "priceQuality": {
          "type": "string",
          "enum": [
            "fast",
            "optimal",
            "verified"
          ],
          "description": "How good should the price estimate be?\n\nFast: The price estimate is chosen among the fastest N price estimates. Optimal: The price estimate is chosen among all price estimates. Verified: The price estimate is chosen among all verified/simulated price estimates.\n\n**NOTE**: Orders are supposed to be created from `verified` or `optimal` price estimates."
        },
        "signingScheme": {
          "type": "string",
          "enum": [
            "eip712",
            "ethsign",
            "presign",
            "eip1271"
          ],
          "description": "How was the order signed?"
        },
        "onchainOrder": {
          "description": "Flag to signal whether the order is intended for on-chain order placement. Only valid for non ECDSA-signed orders.\""
        },
        "validFor": {
          "type": "number",
          "description": "Number (`uint32`) of seconds that the order should be valid for."
        },
        "sellAmountAfterFee": {
          "type": "string",
          "description": "The `sellAmount` for the order."
        },
        "buyAmountAfterFee": {
          "type": "string",
          "description": "The `buyAmount` for the order."
        }
      },
      "additionalProperties": false
    },
    "appData": {
      "type": "object",
      "properties": {
        "appCode": {
          "type": "string",
          "description": "The code identifying the CLI, UI, service generating the order."
        },
        "environment": {
          "type": "string",
          "description": "Environment from which the order came from."
        },
        "metadata": {
          "type": "object",
          "properties": {
            "signer": {
              "type": "string",
              "description": "The address of the trader who signs the CoW Swap order. This field should normally be omitted; it is recommended to use it if the signer is a smart-contract wallet using EIP-1271 signatures."
            },
            "referrer": {
              "type": "object",
              "properties": {
                "address": {
                  "type": "string"
                }
              },
              "required": [
                "address"
              ],
              "additionalProperties": false
            },
            "utm": {
              "type": "object",
              "properties": {
                "utmSource": {
                  "type": "string",
                  "description": "Tracks in which medium the traffic originated from (twitter, facebook, etc.)"
                },
                "utmMedium": {
                  "type": "string",
                  "description": "Tracks in which medium the traffic originated from (mail, CPC, social, etc.)"
                },
                "utmCampaign": {
                  "type": "string",
                  "description": "Track the performance of a specific campaign"
                },
                "utmContent": {
                  "type": "string",
                  "description": "Track which link was clicked"
                },
                "utmTerm": {
                  "type": "string",
                  "description": "Track which keyword term a website visitor came from"
                }
              },
              "additionalProperties": false
            },
            "quote": {
              "type": "object",
              "properties": {
                "slippageBips": {
                  "type": "number",
                  "description": "Slippage tolerance that was applied to the order to get the limit price. Expressed in Basis Points (BPS). One basis point is equivalent to 0.01% (1/100th of a percent)"
                },
                "smartSlippage": {
                  "type": "boolean",
                  "description": "Whether the given slippageBips used is originated from a Smart slippage suggestion"
                }
              },
              "required": [
                "slippageBips"
              ],
              "additionalProperties": false
            },
            "orderClass": {
              "type": "object",
              "properties": {
                "orderClass": {
                  "type": "string",
                  "enum": [
                    "market",
                    "limit",
                    "liquidity",
                    "twap"
                  ],
                  "description": "Indicator of the order class."
                }
              },
              "required": [
                "orderClass"
              ],
              "additionalProperties": false
            },
            "hooks": {
              "type": "object",
              "properties": {
                "version": {
                  "type": "string",
                  "description": "Semantic versioning of document."
                },
                "pre": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "target": {
                        "type": "string",
                        "description": "The contract to call for the hook"
                      },
                      "callData": {
                        "type": "string",
                        "description": "The calldata to use when calling the hook"
                      },
                      "gasLimit": {
                        "type": "string",
                        "description": "The gas limit (in gas units) for the hook"
                      },
                      "dappId": {
                        "type": "string",
                        "description": "CoW Swap has an interface that allows dApps to build hooks for orders. This field is used to identify the dApp that has built the hook."
                      }
                    },
                    "required": [
                      "target",
                      "callData",
                      "gasLimit"
                    ],
                    "additionalProperties": false
                  },
                  "description": "CoW Hooks to call before an order executes"
                },
                "post": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "target": {
                        "type": "string",
                        "description": "The contract to call for the hook"
                      },
                      "callData": {
                        "type": "string",
                        "description": "The calldata to use when calling the hook"
                      },
                      "gasLimit": {
                        "type": "string",
                        "description": "The gas limit (in gas units) for the hook"
                      },
                      "dappId": {
                        "type": "string",
                        "description": "CoW Swap has an interface that allows dApps to build hooks for orders. This field is used to identify the dApp that has built the hook."
                      }
                    },
                    "required": [
                      "target",
                      "callData",
                      "gasLimit"
                    ],
                    "additionalProperties": false
                  },
                  "description": "CoW Hooks to call after an order executes"
                }
              },
              "additionalProperties": false,
              "description": "Optional Pre and Post order interaction hooks attached to a single order"
            },
            "widget": {
              "type": "object",
              "properties": {
                "appCode": {
                  "type": "string",
                  "description": "The code identifying the UI powering the widget"
                },
                "environment": {
                  "type": "string",
                  "description": "Environment from which the order came from."
                }
              },
              "required": [
                "appCode"
              ],
              "additionalProperties": false
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
            "replacedOrder": {
              "type": "object",
              "properties": {
                "uid": {
                  "type": "string",
                  "description": "The replaced order UID."
                }
              },
              "required": [
                "uid"
              ],
              "additionalProperties": false
            }
          },
          "additionalProperties": false,
          "description": "Each metadata will specify one aspect of the order."
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false,
  "definitions": {}
} as const