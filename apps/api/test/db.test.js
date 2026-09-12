import assert from 'node:assert/strict';
import test from 'node:test';
import { postgresSslConfig } from '../src/db.js';

test('loopback PostgreSQL does not enable SSL by default', () => {
  assert.equal(postgresSslConfig('postgres://user:pass@127.0.0.1:5432/app'), false);
  assert.equal(postgresSslConfig('postgres://user:pass@localhost:5432/app'), false);
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
