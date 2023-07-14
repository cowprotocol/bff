interface CalculateValidToParams {
  part: number;
  startTime: number;
  frequency: number;
  span: number;
}

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
