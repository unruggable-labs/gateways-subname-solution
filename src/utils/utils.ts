export function unpadBytes(data: Uint8Array, expectedLength: number): Uint8Array {
  return data.slice(32 - expectedLength);
}

export function getExpectedDecodedLength(coinType: number): number {
  if (Number(coinType) === 0) return 25;
  return 20;
}