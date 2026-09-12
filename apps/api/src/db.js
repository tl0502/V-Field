import { Pool } from 'pg';

const loopbackHosts = new Set(['localhost', '127.0.0.1', '::1']);

export function postgresSslConfig(connectionString) {
  const url = new URL(connectionString);
  const sslmode = (url.searchParams.get('sslmode') ?? '').toLowerCase();
  const host = decodeURIComponent(url.hostname).toLowerCase();

  if (sslmode === 'disable') {
    return false;
  }
  if (sslmode === 'verify-ca' || sslmode === 'verify-full') {
    return { rejectUnauthorized: true };
  }
  if (sslmode === 'require' || sslmode === 'no-verify') {
    return { rejectUnauthorized: false };
  }
  if (loopbackHosts.has(host)) {
    return false;
  }
  return { rejectUnauthorized: false };
}

function sslIsRequired(connectionString) {
  const sslmode = (new URL(connectionString).searchParams.get('sslmode') ?? '').toLowerCase();
  return sslmode === 'require' || sslmode === 'verify-ca' || sslmode === 'verify-full';
}

async function postgresSupportsSsl(connectionString, ssl) {
  const probe = new Pool({
    connectionString,
    ssl,
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

async function resolvePostgresSsl(connectionString, ssl, logger) {
  if (await postgresSupportsSsl(connectionString, ssl)) {
    return ssl;
  }
  if (sslIsRequired(connectionString)) {
    throw new Error('DATABASE_URL 要求 SSL，但 PostgreSQL 服务器不支持 SSL 连接');
  }
  logger.warn(
    'PostgreSQL 未启用 SSL，当前公网连接未加密。应在服务器打开 SSL，或在 DATABASE_URL 加 sslmode=disable 明确跳过。'
  );
  return false;
}

export async function createDatabasePool(connectionString, { logger = console } = {}) {
  if (!connectionString) {
    throw new Error('缺少 DATABASE_URL，API 无法连接 PostgreSQL');
  }

  const requested = postgresSslConfig(connectionString);
  const ssl = requested ? await resolvePostgresSsl(connectionString, requested, logger) : false;
  const pool = new Pool({
    connectionString,
    application_name: 'vquan-next-api',
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
    ...(ssl ? { ssl } : {})
  });

  pool.on('error', (error) => {
    logger.error('PostgreSQL idle client error', error);
  });

  return pool;
}
