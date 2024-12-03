export function stringToBigInt(value: string): bigint {
  return BigInt(value);
}

export function bigIntToString(value: bigint): string {
  return value.toString();
}

export function bufferToString(buffer: Buffer): string {
  return `0x${buffer.toString('hex')}`;
}

export function stringToBuffer(value: string): Buffer {
  return Buffer.from(value.slice(2), 'hex');
}
