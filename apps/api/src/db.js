import { Pool } from 'pg';
import { parseDatabaseUrl } from './database-url.js';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);

function sslConfig(config) {
  const mode = String(config.sslmode ?? '').toLowerCase();
  const host = config.host.toLowerCase().replace(/^\[|\]$/g, '');
  const certificates = typeof config.ssl === 'object' ? config.ssl : {};
  if (mode === 'disable' || config.ssl === false) return false;
  if (mode === 'verify-ca' || mode === 'verify-full') {
    return { ...certificates, rejectUnauthorized: true };
  }
  if (mode === 'require' || mode === 'no-verify' || mode === 'prefer' || config.ssl) {
    return { ...certificates, rejectUnauthorized: false };
  }
  return loopbackHosts.has(host) ? false : { rejectUnauthorized: false };
}

export function postgresSslConfig(connectionString) {
  return sslConfig(parseDatabaseUrl(connectionString));
}

async function postgresSupportsSsl(options) {
  const probe = new Pool({
    ...options,
    max: 1,
    connectionTimeoutMillis: 8_000
  });

  try {
    await probe.query('select 1');
    return true;
  } catch (error) {
    if (String(error.message).includes('does not support SSL')) {
      return false;
    }
    throw error;
  } finally {
    await probe.end().catch(() => {});
  }
}

export async function createDatabasePool(connectionString, {
  logger = console,
  checkSsl = postgresSupportsSsl
} = {}) {
  const config = parseDatabaseUrl(connectionString);
  let ssl = sslConfig(config);
  if (ssl && !await checkSsl({ ...config, ssl })) {
    const mode = String(config.sslmode ?? '').toLowerCase();
    if (['require', 'verify-ca', 'verify-full'].includes(mode) || config.sslnegotiation === 'direct') {
      throw new Error('DATABASE_URL 要求 SSL，但 PostgreSQL 服务器不支持 SSL 连接');
    }
    logger.warn('PostgreSQL 未启用 SSL，当前连接未加密。应在服务器打开 SSL，或在 DATABASE_URL 加 sslmode=disable 明确跳过。');
    ssl = false;
  }
  const pool = new Pool({
    ...config,
    ssl,
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
