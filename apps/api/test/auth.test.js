import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthError, createAuthService } from '../src/auth.js';
import { createApp } from '../src/server.js';
import { createMemoryRepository } from './memory-repository.js';

const sessionTtlMs = 60_000;
const appId = 'wx-test-app';

function createAuth(overrides = {}) {
  const repository = overrides.repository ?? createMemoryRepository();
  const wechatClient = overrides.wechatClient ?? {
    async code2Session(code) {
      if (code === 'bad') {
        const error = new Error('failed');
        throw error;
      }
      return { openid: `openid-${code}`, unionid: null };
    }
  };
  return {
    repository,
    auth: createAuthService({
      repository,
      wechatClient,
      appId,
      sessionTtlMs,
      now: () => new Date('2026-09-12T00:00:00.000Z')
    })
  };
}

async function listen(t, auth) {
  const server = createApp({ auth });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

async function jsonRequest(base, path, { method = 'GET', body, token, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

test('bootstrap then admin login identifies platform operator', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  const result = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  assert.equal(result.roles.platformOperator, true);
  assert.equal(result.audience, 'admin');
  assert.equal(result.loginName, 'platform-operator');
  assert.ok(result.token);
});

test('bootstrap refuses to overwrite an existing platform operator', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  await assert.rejects(
    () => auth.bootstrapPlatformOperator({
      loginName: 'other-operator',
      password: 'another-pass'
    }),
    (error) => error instanceof AuthError && error.code === 'platform_operator_exists'
  );
});

test('wrong admin password is rejected', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  await assert.rejects(
    () => auth.adminLogin({ loginName: 'platform-operator', password: 'nope-nope' }),
    (error) => error instanceof AuthError && error.code === 'invalid_credentials'
  );
});

test('wechat login creates a platform account that is not a domain member', async () => {
  const { auth } = createAuth();
  const result = await auth.wechatLogin({ code: 'new-user' });

  assert.ok(result.account.id);
  assert.equal(result.roles.platformOperator, false);
  assert.deepEqual(result.roles.memberDomainIds, []);
  assert.deepEqual(result.roles.domainOperatorDomainIds, []);
  assert.equal(result.audience, 'miniprogram');
});

test('wechat login is rejected when config is missing', async () => {
  const { auth } = createAuth({
    wechatClient: {
      async code2Session() {
        const { WechatApiError } = await import('../src/wechat-client.js');
        throw new WechatApiError('config_missing', '微信登录配置缺失');
      }
    }
  });

  await assert.rejects(
    () => auth.wechatLogin({ code: 'any' }),
    (error) => error instanceof AuthError && error.code === 'wechat_config_missing'
  );
});

test('HTTP admin login, me, logout and dev token rejection', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);

  const health = await jsonRequest(base, '/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);

  const meta = await jsonRequest(base, '/api/meta');
  assert.deepEqual(meta.body.notDelivered, [
    'assign-domain-operator',
    'join-approval',
    'publish',
    'read'
  ]);

  const login = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.roles.platformOperator, true);

  const me = await jsonRequest(base, '/api/auth/me', { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.roles.platformOperator, true);

  const withDevToken = await jsonRequest(base, '/api/auth/me', {
    headers: { 'x-dev-token': 'anything' }
  });
  assert.equal(withDevToken.status, 401);
  assert.equal(withDevToken.body.error, 'unauthorized');

  const logout = await jsonRequest(base, '/api/auth/logout', {
    method: 'POST',
    token: login.body.token
  });
  assert.equal(logout.status, 200);

  const meAfterLogout = await jsonRequest(base, '/api/auth/me', { token: login.body.token });
  assert.equal(meAfterLogout.status, 401);
});
