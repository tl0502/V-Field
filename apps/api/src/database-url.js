import { parseIntoClientConfig } from 'pg-connection-string';

export function parseDatabaseUrl(connectionString) {
  if (typeof connectionString !== 'string' || !connectionString.trim()) {
    throw new Error('缺少 DATABASE_URL，API 无法连接 PostgreSQL');
  }
  try {
    if (!/^postgres(?:ql)?:\/\//i.test(connectionString.trim())) throw new Error();
    const config = parseIntoClientConfig(connectionString.trim());
    if (!config.host || !config.database || (config.port !== undefined &&
        (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535))) {
      throw new Error();
    }
    // Never let a query parameter reintroduce a connection string for pg to parse.
    delete config.connectionString;
    return config;
  } catch {
    // URL/parser errors can retain the complete password-bearing input or cause.
    throw new Error('DATABASE_URL 格式或连接选项无效，请检查本地配置');
  }
}
