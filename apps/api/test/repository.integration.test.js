import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { Pool } from 'pg';
import { createAuthService } from '../src/auth.js';
import { hashSessionToken } from '../src/crypto.js';
import { parseDatabaseUrl } from '../src/database-url.js';
import { runMigrations } from '../src/migrate.js';
import { createIdentityRepository } from '../src/repository.js';
import { testDatabaseUrl } from './test-database.js';

const databaseUrl = testDatabaseUrl();
const skip = databaseUrl ? false : 'Use npm run test:postgres for isolated PostgreSQL checks';

async function fixture(t) {
  const config = parseDatabaseUrl(databaseUrl);
  const admin = new Pool(config);
  const schema = `review_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
  t.after(async () => {
    await pool.end();
    try { await admin.query(`DROP SCHEMA ${schema} CASCADE`); }
    finally { await admin.end(); }
  });
  await runMigrations(pool);
  const repository = createIdentityRepository(pool);
  const auth = createAuthService({
    repository,
    appId: 'isolated-review',
    sessionTtlMs: 60_000,
    wechatClient: { async code2Session() { return { openid: 'same-user', unionid: null }; } }
  });
  return { pool, repository, auth };
}

test('PostgreSQL admits only one concurrent initial operator', { skip }, async (t) => {
  const { auth, pool } = await fixture(t);
  const results = await Promise.allSettled([
    auth.bootstrapPlatformOperator({ loginName: 'operator-one', password: 'review-password-one' }),
    auth.bootstrapPlatformOperator({ loginName: 'operator-two', password: 'review-password-two' })
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(results.find((result) => result.status === 'rejected').reason.code, 'platform_operator_exists');
  for (const table of ['platform_accounts', 'platform_operator_grants', 'admin_credentials']) {
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 1);
  }
});

test('PostgreSQL rolls back a failed bootstrap and permits retry', { skip }, async (t) => {
  const { auth, repository, pool } = await fixture(t);
  await assert.rejects(repository.createPlatformOperator({
    accountId: randomUUID(), loginName: 'operator-one', passwordHash: null, now: new Date()
  }), { code: '23502' });
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM platform_accounts')).rows[0].n, 0);
  assert.equal(await repository.countPlatformOperators(), 0);
  await auth.bootstrapPlatformOperator({ loginName: 'operator-one', password: 'review-password' });
  assert.equal(await repository.countPlatformOperators(), 1);
});

test('PostgreSQL concurrent logins leave exactly one active session', { skip }, async (t) => {
  const { auth, pool } = await fixture(t);
  await auth.wechatLogin({ code: 'initial' });
  // Delay insertion to reliably expose UPDATE/INSERT gaps in non-atomic rotation.
  await pool.query(`
    CREATE FUNCTION delay_session_insert() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN PERFORM pg_sleep(0.03); RETURN NEW; END $$;
    CREATE TRIGGER session_insert_delay BEFORE INSERT ON auth_sessions
    FOR EACH ROW EXECUTE FUNCTION delay_session_insert();
  `);
  const logins = await Promise.all(Array.from({ length: 6 }, () => auth.wechatLogin({ code: 'again' })));
  const accepted = await Promise.allSettled(logins.map((login) => auth.readSession(login.token, 'miniprogram')));
  assert.equal(accepted.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM auth_sessions WHERE revoked_at IS NULL')).rows[0].n, 1);
});

test('PostgreSQL failed rotation preserves the previous valid session', { skip }, async (t) => {
  const { auth, repository } = await fixture(t);
  const login = await auth.wechatLogin({ code: 'initial' });
  await assert.rejects(repository.rotateSession({
    id: randomUUID(), accountId: login.account.id, audience: 'miniprogram',
    tokenHash: hashSessionToken(login.token), createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000)
  }), { code: '23505' });
  assert.equal((await auth.readSession(login.token, 'miniprogram')).body.account.id, login.account.id);
});
