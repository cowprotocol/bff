export function bytesToHexString(bytes: Buffer): string {
  return '0x' + bytes.toString('hex')
}

export function hexStringToBytes(hex: string): Buffer {
  return Buffer.from(hex.slice(2), 'hex')
}