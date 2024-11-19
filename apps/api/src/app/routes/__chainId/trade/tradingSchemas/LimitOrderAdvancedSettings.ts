export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
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