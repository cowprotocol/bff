export default {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "account": {
      "type": "string"
    },
    "chainId": {
      "type": "number",
      "enum": [
        1,
        100,
        42161,
        8453,
        11155111
      ],
      "description": "Supported chains and their `chainId` for the SDK."
    },
    "appCode": {
      "type": "string"
    }
  },
  "required": [
    "account",
    "appCode",
    "chainId"
  ],
  "definitions": {}
} as const