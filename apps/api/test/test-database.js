import { parseDatabaseUrl } from '../src/database-url.js';

export function testDatabaseUrl() {
  const value = process.env.TEST_DATABASE_URL?.trim();
  if (!value) return '';
  const config = parseDatabaseUrl(value);
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(config.host) ||
      !config.database.startsWith('vquan_test_')) {
    throw new Error('Database tests require a loopback database named vquan_test_*');
  }
  return value;
}
