export function getAffiliateProgramTableName(): string {
  const value = process.env.DUNE_AFFILIATE_PROGRAM_TABLE_NAME;
  if (!value) {
    throw new Error('DUNE_AFFILIATE_PROGRAM_TABLE_NAME is not set');
  }
  return value;
}
