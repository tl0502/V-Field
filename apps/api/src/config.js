import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseDatabaseUrl } from './database-url.js';

const envPath = fileURLToPath(new URL('../.env', import.meta.url));

dotenv.config({ path: envPath, quiet: true });

export const defaultPort = 3064;
export const defaultHost = '127.0.0.1';
const allowedHosts = new Set(['127.0.0.1', '0.0.0.0', '::', '::1']);

export const PRESET_AUTO_DOMAIN = {
  id: '8b1c0e2a-4d3f-4a6b-9c1d-0e2f3a4b5c6d',
  slug: 'auto-verify',
  name: '汽车验证域'
};

export function getPort() {
  const port = Number(process.env.PORT ?? defaultPort);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT 必须是 1 到 65535 之间的整数');
  }

  return port;
}

export function getHost() {
  const host = (process.env.HOST ?? defaultHost).trim() || defaultHost;

  if (!allowedHosts.has(host)) {
    throw new Error('HOST 必须是 127.0.0.1、0.0.0.0、:: 或 ::1');
  }

  return host;
}

export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() ?? '';
}

export function getWechatAppId() {
  return process.env.WECHAT_APP_ID?.trim() ?? '';
}

export function getWechatAppSecret() {
  return process.env.WECHAT_APP_SECRET?.trim() ?? '';
}

export function getBootstrapLoginName() {
  return process.env.PLATFORM_BOOTSTRAP_LOGIN?.trim() ?? '';
}

export function getBootstrapPassword() {
  return process.env.PLATFORM_BOOTSTRAP_PASSWORD?.trim() ?? '';
}

export function getSessionTtlMs() {
  const days = Number(process.env.SESSION_TTL_DAYS ?? 30);

  if (!Number.isFinite(days) || days < 1 || days > 365) {
    throw new Error('SESSION_TTL_DAYS 必须是 1 到 365 之间的数字');
  }

  return days * 24 * 60 * 60 * 1000;
}

export function isDbResetAllowed() {
  return process.env.ALLOW_DB_RESET?.trim() === '1';
}

export function describeDatabaseTarget(connectionString) {
  if (!connectionString) {
    return { host: '', port: '', database: '', user: '' };
  }

  const config = parseDatabaseUrl(connectionString);
  return {
    host: config.host,
    port: String(config.port || 5432),
    database: config.database,
    user: config.user
  };
}
