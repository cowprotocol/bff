interface CalculateValidToParams {
  part: number;
  startTime: number;
  frequency: number;
  span: number;
}

/**
 * Calculates valid to for a TWAP order.
 *
 * Read more: https://github.com/rndlabs/composable-cow/blob/cd893fa255f630870ad53012dac7f1400ec5e849/src/types/twap/libraries/TWAPOrderMathLib.sol
 * @param {CalculateValidToParams} params Parameters for calculating validTo: part, startTime, frequency, span.
 * @returns {number} Until when the order is valid.
 */
export function calculateValidTo({
  part,
  startTime,
  frequency,
  span,
}: CalculateValidToParams): number {
  if (span === 0) {
    return startTime + (part + 1) * frequency - 1;
  }

  return startTime + part * frequency + span - 1;
}
