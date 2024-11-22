export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "tradeParameters": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
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
        "amount": {
          "type": "string"
        }
      },
      "required": [
        "amount",
        "buyToken",
        "buyTokenDecimals",
        "kind",
        "sellToken",
        "sellTokenDecimals"
      ]
    },
    "orderToSign": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "receiver": {
          "type": "string"
        },
        "sellToken": {
          "type": "string",
          "description": "ERC-20 token to be sold."
        },
        "buyToken": {
          "type": "string",
          "description": "ERC-20 token to be bought."
        },
        "sellAmount": {
          "type": "string",
          "description": "Amount of `sellToken` to be sold in atoms."
        },
        "buyAmount": {
          "type": "string",
          "description": "Amount of `buyToken` to be bought in atoms."
        },
        "validTo": {
          "type": "number",
          "description": "Unix timestamp (`uint32`) until which the order is valid."
        },
        "appData": {
          "type": "string",
          "description": "32 bytes encoded as hex with `0x` prefix. It's expected to be the hash of the stringified JSON object representing the `appData`."
        },
        "feeAmount": {
          "type": "string",
          "description": "feeRatio * sellAmount + minimal_fee in atoms."
        },
        "kind": {
          "type": "string",
          "enum": [
            "buy",
            "sell"
          ],
          "description": "The kind is either a buy or sell order."
        },
        "partiallyFillable": {
          "type": "boolean",
          "description": "Is the order fill-or-kill or partially fillable?"
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
        "signingScheme": {
          "type": "string",
          "enum": [
            "eip712",
            "ethsign",
            "presign",
            "eip1271"
          ],
          "description": "How was the order signed?"
        }
      },
      "required": [
        "appData",
        "buyAmount",
        "buyToken",
        "feeAmount",
        "kind",
        "partiallyFillable",
        "receiver",
        "sellAmount",
        "sellToken",
        "validTo"
      ],
      "description": "Unsigned order intent to be placed."
    },
    "quoteResponse": {
      "type": "object",
      "properties": {
        "quote": {
          "type": "object",
          "properties": {
            "sellToken": {
              "type": "string",
              "description": "ERC-20 token to be sold."
            },
            "buyToken": {
              "type": "string",
              "description": "ERC-20 token to be bought."
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
            "sellAmount": {
              "type": "string",
              "description": "Amount of `sellToken` to be sold in atoms."
            },
            "buyAmount": {
              "type": "string",
              "description": "Amount of `buyToken` to be bought in atoms."
            },
            "validTo": {
              "type": "number",
              "description": "Unix timestamp (`uint32`) until which the order is valid."
            },
            "appData": {
              "type": "string",
              "description": "32 bytes encoded as hex with `0x` prefix. It's expected to be the hash of the stringified JSON object representing the `appData`."
            },
            "feeAmount": {
              "type": "string",
              "description": "feeRatio * sellAmount + minimal_fee in atoms."
            },
            "kind": {
              "type": "string",
              "enum": [
                "buy",
                "sell"
              ],
              "description": "The kind is either a buy or sell order."
            },
            "partiallyFillable": {
              "type": "boolean",
              "description": "Is the order fill-or-kill or partially fillable?"
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
            "signingScheme": {
              "type": "string",
              "enum": [
                "eip712",
                "ethsign",
                "presign",
                "eip1271"
              ],
              "description": "How was the order signed?"
            }
          },
          "required": [
            "sellToken",
            "buyToken",
            "sellAmount",
            "buyAmount",
            "validTo",
            "appData",
            "feeAmount",
            "kind",
            "partiallyFillable"
          ],
          "additionalProperties": false,
          "description": "Order parameters."
        },
        "from": {
          "type": "string",
          "description": "20 byte Ethereum address encoded as a hex with `0x` prefix."
        },
        "expiration": {
          "type": "string",
          "description": "Expiration date of the offered fee. Order service might not accept the fee after this expiration date. Encoded as ISO 8601 UTC."
        },
        "id": {
          "type": "number",
          "description": "Quote ID linked to a quote to enable providing more metadata when analysing order slippage."
        },
        "verified": {
          "type": "boolean",
          "description": "Whether it was possible to verify that the quoted amounts are accurate using a simulation."
        }
      },
      "required": [
        "quote",
        "expiration",
        "verified"
      ],
      "additionalProperties": false,
      "description": "An order quoted by the backend that can be directly signed and submitted to the order creation backend."
    },
    "appDataInfo": {
      "type": "object",
      "properties": {
        "doc": {
          "type": "object",
          "properties": {
            "version": {
              "type": "string",
              "description": "Semantic versioning of document."
            },
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
          "required": [
            "version",
            "metadata"
          ],
          "additionalProperties": false,
          "description": "Metadata JSON document for adding information to orders."
        },
        "fullAppData": {
          "type": "string"
        },
        "appDataKeccak256": {
          "type": "string"
        },
        "env": {
          "type": "string",
          "enum": [
            "prod",
            "staging"
          ],
          "description": "The environment to use for the Cow API."
        }
      },
      "required": [
        "doc",
        "fullAppData",
        "appDataKeccak256"
      ],
      "additionalProperties": false
    },
    "orderTypedData": {
      "type": "object",
      "properties": {
        "domain": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string"
            },
            "version": {
              "type": "string"
            },
            "chainId": {
              "type": "number"
            },
            "verifyingContract": {
              "type": "string"
            }
          },
          "required": [
            "name",
            "version",
            "chainId",
            "verifyingContract"
          ],
          "additionalProperties": false
        },
        "primaryType": {
          "type": "string",
          "const": "Order"
        },
        "types": {
          "type": "object",
          "additionalProperties": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": {
                  "type": "string"
                },
                "type": {
                  "type": "string"
                }
              },
              "required": [
                "name",
                "type"
              ],
              "additionalProperties": false
            }
          }
        },
        "message": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "receiver": {
              "type": "string"
            },
            "sellToken": {
              "type": "string",
              "description": "ERC-20 token to be sold."
            },
            "buyToken": {
              "type": "string",
              "description": "ERC-20 token to be bought."
            },
            "sellAmount": {
              "type": "string",
              "description": "Amount of `sellToken` to be sold in atoms."
            },
            "buyAmount": {
              "type": "string",
              "description": "Amount of `buyToken` to be bought in atoms."
            },
            "validTo": {
              "type": "number",
              "description": "Unix timestamp (`uint32`) until which the order is valid."
            },
            "appData": {
              "type": "string",
              "description": "32 bytes encoded as hex with `0x` prefix. It's expected to be the hash of the stringified JSON object representing the `appData`."
            },
            "feeAmount": {
              "type": "string",
              "description": "feeRatio * sellAmount + minimal_fee in atoms."
            },
            "kind": {
              "type": "string",
              "enum": [
                "buy",
                "sell"
              ],
              "description": "The kind is either a buy or sell order."
            },
            "partiallyFillable": {
              "type": "boolean",
              "description": "Is the order fill-or-kill or partially fillable?"
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
            "signingScheme": {
              "type": "string",
              "enum": [
                "eip712",
                "ethsign",
                "presign",
                "eip1271"
              ],
              "description": "How was the order signed?"
            }
          },
          "required": [
            "appData",
            "buyAmount",
            "buyToken",
            "feeAmount",
            "kind",
            "partiallyFillable",
            "receiver",
            "sellAmount",
            "sellToken",
            "validTo"
          ],
          "description": "Unsigned order intent to be placed."
        }
      },
      "required": [
        "domain",
        "primaryType",
        "types",
        "message"
      ],
      "additionalProperties": false
    },
    "amountsAndCosts": {
      "type": "object",
      "properties": {
        "isSell": {
          "type": "boolean"
        },
        "costs": {
          "type": "object",
          "properties": {
            "networkFee": {
              "type": "object",
              "properties": {
                "amountInSellCurrency": {
                  "type": "string"
                },
                "amountInBuyCurrency": {
                  "type": "string"
                }
              },
              "required": [
                "amountInSellCurrency",
                "amountInBuyCurrency"
              ],
              "additionalProperties": false
            },
            "partnerFee": {
              "type": "object",
              "properties": {
                "amount": {
                  "type": "string"
                },
                "bps": {
                  "type": "number"
                }
              },
              "required": [
                "amount",
                "bps"
              ],
              "additionalProperties": false
            }
          },
          "required": [
            "networkFee",
            "partnerFee"
          ],
          "additionalProperties": false
        },
        "beforeNetworkCosts": {
          "type": "object",
          "properties": {
            "sellAmount": {
              "type": "string"
            },
            "buyAmount": {
              "type": "string"
            }
          },
          "required": [
            "sellAmount",
            "buyAmount"
          ],
          "additionalProperties": false
        },
        "afterNetworkCosts": {
          "type": "object",
          "properties": {
            "sellAmount": {
              "type": "string"
            },
            "buyAmount": {
              "type": "string"
            }
          },
          "required": [
            "sellAmount",
            "buyAmount"
          ],
          "additionalProperties": false
        },
        "afterPartnerFees": {
          "type": "object",
          "properties": {
            "sellAmount": {
              "type": "string"
            },
            "buyAmount": {
              "type": "string"
            }
          },
          "required": [
            "sellAmount",
            "buyAmount"
          ],
          "additionalProperties": false
        },
        "afterSlippage": {
          "type": "object",
          "properties": {
            "sellAmount": {
              "type": "string"
            },
            "buyAmount": {
              "type": "string"
            }
          },
          "required": [
            "sellAmount",
            "buyAmount"
          ],
          "additionalProperties": false
        }
      },
      "required": [
        "isSell",
        "costs",
        "beforeNetworkCosts",
        "afterNetworkCosts",
        "afterPartnerFees",
        "afterSlippage"
      ],
      "additionalProperties": false,
      "description": "CoW Protocol quote has amounts (sell/buy) and costs (network fee), there is also partner fees. Besides that, CoW Protocol supports both sell and buy orders and the fees and costs are calculated differently.\n\nThe order of adding fees and costs is as follows: 1. Network fee is always added to the sell amount 2. Partner fee is added to the surplus amount (sell amount for sell-orders, buy amount for buy-orders)\n\nFor sell-orders the partner fee is subtracted from the buy amount after network costs. For buy-orders the partner fee is added on top of the sell amount after network costs."
    }
  },
  "required": [
    "amountsAndCosts",
    "appDataInfo",
    "orderToSign",
    "orderTypedData",
    "quoteResponse",
    "tradeParameters"
  ],
  "additionalProperties": false,
  "definitions": {}
} as const