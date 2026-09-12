import { Pool } from 'pg';

export function createDatabasePool(connectionString, { logger = console } = {}) {
  if (!connectionString) {
    throw new Error('缺少 DATABASE_URL，API 无法连接 PostgreSQL');
  }

  const pool = new Pool({
    connectionString,
    application_name: 'vquan-next-api',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000
  });

  pool.on('error', (error) => {
    logger.error('PostgreSQL idle client error', error);
  });

  return pool;
}
