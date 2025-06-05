export const isDbEnabled =
  process.env.DATABASE_ENABLED !== undefined
    ? process.env.DATABASE_ENABLED === 'true'
    : !!process.env.DATABASE_HOST;
