import assert from 'node:assert/strict';
import test from 'node:test';
import { createDatabasePool } from '../src/db.js';
import { testDatabaseUrl } from './test-database.js';

const expectedTables = [
  'admin_credentials',
  'article_types',
  'articles',
  'auth_sessions',
  'business_domains',
  'domain_join_requests',
  'domain_memberships',
  'domain_operator_grants',
  'domain_tags',
  'platform_accounts',
  'platform_operator_grants',
  'schema_migrations',
  'wechat_identities'
].sort();

const forbiddenTables = ['users', 'vehicle_sheets', 'vehicle_sheet_items'];

test('migrated database has identity tables and the auto-verify seed', async (t) => {
  const databaseUrl = testDatabaseUrl();
  if (!databaseUrl) {
    t.skip('TEST_DATABASE_URL is not configured; use npm run test:postgres');
    return;
  }

  const pool = await createDatabasePool(databaseUrl);
  t.after(() => pool.end());

  const tables = await pool.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  const names = tables.rows.map((row) => row.tablename);
  assert.deepEqual(names, expectedTables);

  for (const name of forbiddenTables) {
    assert.equal(names.includes(name), false);
  }

  const domain = await pool.query(
    `SELECT slug, name FROM business_domains WHERE slug = 'auto-verify'`
  );
  assert.equal(domain.rowCount, 1);
  assert.equal(domain.rows[0].name, '汽车验证域');
});
