import { HookData } from '../HooksService';

// Check required string fields
const requiredStringFields = [
  'environment',
  'block_time',
  'app_code',
  'hook_type',
  'target',
  'app_hash',
  'tx_hash',
];

export function isHookData(data: unknown): data is HookData {
  // Check if data is an object
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  for (const field of requiredStringFields) {
    if (typeof (data as Record<string, unknown>)[field] !== 'string') {
      return false;
    }
  }

  // Check required boolean fields
  const requiredBooleanFields = ['is_bridging', 'success'];
  for (const field of requiredBooleanFields) {
    if (typeof (data as Record<string, unknown>)[field] !== 'boolean') {
      return false;
    }
  }

  // Check required number field
  if (typeof (data as Record<string, unknown>).gas_limit !== 'number') {
    return false;
  }

  // Check nullable fields
  const dataRecord = data as Record<string, unknown>;
  if (
    dataRecord.destination_chain_id !== null &&
    typeof dataRecord.destination_chain_id !== 'number'
  ) {
    return false;
  }
  if (
    dataRecord.destination_token_address !== null &&
    typeof dataRecord.destination_token_address !== 'string'
  ) {
    return false;
  }
  if (dataRecord.app_id !== null && typeof dataRecord.app_id !== 'string') {
    return false;
  }

  return true;
}
