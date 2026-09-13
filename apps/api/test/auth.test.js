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
      appId: overrides.appId ?? appId,
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

async function jsonRequest(base, path, { method = 'GET', body, token, audience, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(audience ? { 'x-vquan-audience': audience } : {}),
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

test('concurrent bootstrap admits only one initial operator', async () => {
  const { auth, repository } = createAuth();
  const results = await Promise.allSettled([
    auth.bootstrapPlatformOperator({ loginName: 'first-one', password: 'correct-horse' }),
    auth.bootstrapPlatformOperator({ loginName: 'first-two', password: 'correct-horse' })
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(await repository.countPlatformOperators(), 1);
});

test('login endpoints reject non-object JSON with a client error', async (t) => {
  const { auth } = createAuth();
  const base = await listen(t, auth);
  for (const path of ['/api/auth/admin/login', '/api/auth/wechat/login']) {
    for (const body of [null, [], 'text', 42, true]) {
      const response = await fetch(`${base}${path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'invalid_body' });
    }
  }
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

test('wechat login prefers callContainer openid and skips code exchange', async () => {
  let exchanged = 0;
  const { auth } = createAuth({
    wechatClient: {
      async code2Session() {
        exchanged += 1;
        throw new Error('code2Session should not run');
      }
    }
  });

  const result = await auth.wechatLogin({
    code: 'should-be-ignored',
    openid: 'cloud-openid',
    unionid: 'cloud-unionid',
    headerAppId: appId
  });

  assert.equal(exchanged, 0);
  assert.ok(result.token);
  assert.equal(result.audience, 'miniprogram');
  assert.equal(result.roles.platformOperator, false);
});

test('wechat login rejects a callContainer identity for a different app id', async () => {
  const { auth } = createAuth();
  await assert.rejects(
    () => auth.wechatLogin({
      openid: 'cloud-openid',
      headerAppId: 'wx-other-app'
    }),
    (error) => error instanceof AuthError && error.code === 'wechat_login_failed'
  );
});

test('HTTP wechat login accepts WeChat CloudRun identity headers', async (t) => {
  let exchanged = 0;
  const { auth } = createAuth({
    wechatClient: {
      async code2Session(code) {
        exchanged += 1;
        return { openid: `openid-${code}`, unionid: null };
      }
    }
  });
  const base = await listen(t, auth);
  const response = await jsonRequest(base, '/api/auth/wechat/login', {
    method: 'POST',
    body: { code: 'unused-code' },
    headers: {
      'x-wx-openid': 'header-openid',
      'x-wx-appid': appId,
      'x-wx-unionid': 'header-unionid'
    }
  });

  assert.equal(response.status, 200);
  assert.equal(exchanged, 0);
  assert.ok(response.body.token);
  assert.equal(response.body.audience, 'miniprogram');
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

  const me = await jsonRequest(base, '/api/auth/me', {
    token: login.body.token,
    audience: 'admin'
  });
  assert.equal(me.status, 200);
  assert.equal(me.body.roles.platformOperator, true);

  const withDevToken = await jsonRequest(base, '/api/auth/me', {
    headers: { 'x-dev-token': 'anything' }
  });
  assert.equal(withDevToken.status, 401);
  assert.equal(withDevToken.body.error, 'unauthorized');

  const logout = await jsonRequest(base, '/api/auth/logout', {
    method: 'POST',
    token: login.body.token,
    audience: 'admin'
  });
  assert.equal(logout.status, 200);

  const meAfterLogout = await jsonRequest(base, '/api/auth/me', {
    token: login.body.token,
    audience: 'admin'
  });
  assert.equal(meAfterLogout.status, 401);
});

test('re-login revokes the previous session for the same audience', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  const first = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const second = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });

  await assert.rejects(
    () => auth.readSession(first.token, 'admin'),
    (error) => error instanceof AuthError && error.code === 'unauthorized'
  );

  const current = await auth.readSession(second.token, 'admin');
  assert.equal(current.body.account.id, second.account.id);
});

test('miniprogram token cannot be used as an admin session', async (t) => {
  const { auth } = createAuth();
  const wechat = await auth.wechatLogin({ code: 'new-user' });
  const base = await listen(t, auth);

  const asAdmin = await jsonRequest(base, '/api/auth/me', {
    token: wechat.token,
    audience: 'admin'
  });
  assert.equal(asAdmin.status, 401);
  assert.equal(asAdmin.body.error, 'unauthorized');

  const asMiniprogram = await jsonRequest(base, '/api/auth/me', {
    token: wechat.token,
    audience: 'miniprogram'
  });
  assert.equal(asMiniprogram.status, 200);
  assert.equal(asMiniprogram.body.audience, 'miniprogram');
});

test('auth me and logout require a matching audience header', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const login = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);

  const missing = await jsonRequest(base, '/api/auth/me', { token: login.token });
  assert.equal(missing.status, 200);
  assert.equal(missing.body.audience, 'admin');

  const wrong = await jsonRequest(base, '/api/auth/me', {
    token: login.token,
    audience: 'miniprogram'
  });
  assert.equal(wrong.status, 401);
});

test('auth me accepts audience query and x-vquan-session fallbacks', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const login = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);

  const viaQuery = await jsonRequest(base, '/api/auth/me?audience=admin', {
    token: login.token
  });
  assert.equal(viaQuery.status, 200);
  assert.equal(viaQuery.body.roles.platformOperator, true);

  const viaSessionHeader = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin',
    headers: { 'x-vquan-session': login.token }
  });
  assert.equal(viaSessionHeader.status, 200);
  assert.equal(viaSessionHeader.body.account.id, login.account.id);
});
