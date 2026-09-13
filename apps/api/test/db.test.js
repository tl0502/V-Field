import assert from 'node:assert/strict';
import test from 'node:test';
import { inspect } from 'node:util';
import { Client } from 'pg';
import { createDatabasePool, postgresSslConfig } from '../src/db.js';
import { describeDatabaseTarget } from '../src/config.js';

test('loopback PostgreSQL does not enable SSL by default', () => {
  assert.equal(postgresSslConfig('postgres://user:pass@127.0.0.1:5432/app'), false);
  assert.equal(postgresSslConfig('postgres://user:pass@localhost:5432/app'), false);
});

test('SSL fallback remains disabled in the effective pg client configuration', async () => {
  for (const mode of ['prefer', 'no-verify']) {
    let warned = false;
    const pool = await createDatabasePool(`postgres://review:fake@db.invalid/review?sslmode=${mode}`, {
      checkSsl: async () => false,
      logger: { warn() { warned = true; }, error() {} }
    });
    try {
      assert.equal(warned, true);
      assert.equal(new Client(pool.options).connectionParameters.ssl, false);
      assert.equal(pool.options.connectionString, undefined);
    } finally { await pool.end(); }
  }
});

test('required SSL cannot silently fall back and preserves its verification setting', async () => {
  const url = 'postgres://review:fake@db.invalid/review?sslmode=require';
  await assert.rejects(createDatabasePool(url, { checkSsl: async () => false }), /要求 SSL/);
  const pool = await createDatabasePool(url, { checkSsl: async () => true });
  try {
    assert.equal(new Client(pool.options).connectionParameters.ssl.rejectUnauthorized, false);
  } finally { await pool.end(); }
});

test('malformed database configuration never exposes the original password', () => {
  for (const parse of [postgresSslConfig, describeDatabaseTarget]) {
    for (const suffix of [':bad/review', '/review?port=invalid']) {
      assert.throws(() => parse(`postgres://review:PRIVATE_TEST_VALUE@db.invalid${suffix}`), (error) => {
        assert.equal(inspect(error).includes('PRIVATE_TEST_VALUE'), false);
        assert.equal(error.input, undefined);
        assert.equal(error.cause, undefined);
        return /DATABASE_URL/.test(error.message);
      });
    }
  }
});

test('public PostgreSQL enables SSL encryption', () => {
  assert.deepEqual(
    postgresSslConfig('postgres://user:pass@db.example.com:5432/app'),
    { rejectUnauthorized: false }
  );
});

test('sslmode in the URL overrides the host default', () => {
  assert.equal(
    postgresSslConfig('postgres://user:pass@db.example.com:5432/app?sslmode=disable'),
    false
  );
  assert.deepEqual(
    postgresSslConfig('postgres://user:pass@127.0.0.1:5432/app?sslmode=verify-full'),
    { rejectUnauthorized: true }
  );
  assert.deepEqual(
    postgresSslConfig('postgres://user:pass@db.example.com:5432/app?sslmode=require'),
    { rejectUnauthorized: false }
  );
});
