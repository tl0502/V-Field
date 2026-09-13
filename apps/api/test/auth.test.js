import assert from 'node:assert/strict';
import http from 'node:http';
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

async function jsonRequest(base, path, { method = 'GET', body, token, audience, headers = {}, cookies } = {}) {
  const url = new URL(path, base);
  const payload = body === undefined ? null : JSON.stringify(body);
  const requestHeaders = {
    ...(payload !== null ? {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(payload)
    } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...(audience ? { 'x-vquan-audience': audience } : {}),
    ...(cookies ? { cookie: cookies } : {}),
    ...headers
  };
  const { status, raw, setCookie } = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method,
      headers: requestHeaders
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        raw: Buffer.concat(chunks).toString('utf8'),
        setCookie: [].concat(res.headers['set-cookie'] ?? []).join(', ')
      }));
    });
    req.on('error', reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
  return { status, body: JSON.parse(raw), setCookie };
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
  assert.equal(result.audience, 'admin-platform');
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

  for (const path of ['/', '/health', '/api/health']) {
    const probe = await jsonRequest(base, path);
    assert.equal(probe.status, 200);
    assert.deepEqual(probe.body, { ok: true, service: 'vquan-next-api' });
  }

  const meta = await jsonRequest(base, '/api/meta');
  assert.deepEqual(meta.body.notDelivered, [
    'assign-domain-operator',
    'join-approval',
    'publish',
    'read'
  ]);

  const login = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.roles.platformOperator, true);
  assert.equal(login.body.audience, 'admin-platform');
  assert.match(login.setCookie, /vquan_admin_platform=/);
  assert.match(login.setCookie, /HttpOnly/i);
  assert.match(login.setCookie, /SameSite=Lax/i);
  assert.equal(/Secure/i.test(login.setCookie), false);

  const cookieMe = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${login.body.token}`
  });
  assert.equal(cookieMe.status, 200);
  assert.equal(cookieMe.body.roles.platformOperator, true);

  const me = await jsonRequest(base, '/api/auth/me', {
    token: login.body.token,
    audience: 'admin-platform'
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
    audience: 'admin-platform'
  });
  assert.equal(logout.status, 200);

  const meAfterLogout = await jsonRequest(base, '/api/auth/me', {
    token: login.body.token,
    audience: 'admin-platform'
  });
  assert.equal(meAfterLogout.status, 401);
});

test('failed admin login does not expire an existing cookie', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);
  const login = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  const failed = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${login.body.token}`,
    body: { loginName: 'platform-operator', password: 'wrong-password' }
  });
  assert.equal(failed.status, 401);
  assert.equal(/Max-Age=0/i.test(failed.setCookie), false);
  const me = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${login.body.token}`
  });
  assert.equal(me.status, 200);
});

test('stale bearer 401 does not expire a valid admin cookie', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);
  const first = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  const second = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${first.body.token}`,
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  const stale = await jsonRequest(base, '/api/auth/me', {
    token: first.body.token,
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${second.body.token}`
  });
  assert.equal(stale.status, 401);
  assert.equal(/Max-Age=0/i.test(stale.setCookie), false);
  const me = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${second.body.token}`
  });
  assert.equal(me.status, 200);
});

test('logout of an old admin token does not expire a newer cookie session', async (t) => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const base = await listen(t, auth);
  const first = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  const second = await jsonRequest(base, '/api/auth/admin/login', {
    method: 'POST',
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${first.body.token}`,
    body: { loginName: 'platform-operator', password: 'correct-horse' }
  });
  const logout = await jsonRequest(base, '/api/auth/logout', {
    method: 'POST',
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${first.body.token}`
  });
  assert.equal(logout.status, 401);
  assert.equal(/Max-Age=0/i.test(logout.setCookie), false);
  const me = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin-platform',
    cookies: `vquan_admin_platform=${second.body.token}`
  });
  assert.equal(me.status, 200);
});

test('miniprogram re-login revokes the previous session', async () => {
  const { auth } = createAuth();
  const first = await auth.wechatLogin({ code: 'same-user' });
  const second = await auth.wechatLogin({ code: 'same-user' });
  await assert.rejects(
    () => auth.readSession(first.token, 'miniprogram'),
    (error) => error instanceof AuthError && error.code === 'unauthorized'
  );
  const current = await auth.readSession(second.token, 'miniprogram');
  assert.equal(current.body.account.id, second.account.id);
});

test('admin keeps three sessions per audience and the fourth revokes the oldest', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const tokens = [];
  for (let index = 0; index < 4; index += 1) {
    tokens.push(await auth.adminLogin({
      loginName: 'platform-operator',
      password: 'correct-horse',
      audience: 'admin-platform'
    }));
  }
  const results = await Promise.allSettled(
    tokens.map((login) => auth.readSession(login.token, 'admin-platform'))
  );
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 3);
  assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
  assert.equal(
    results.find((result) => result.status === 'rejected')?.reason.code,
    'unauthorized'
  );
});

test('platform and domain admin sessions do not revoke each other', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const platform = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse',
    audience: 'admin-platform'
  });
  const domain = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse',
    audience: 'admin-domain'
  });
  assert.equal((await auth.readSession(platform.token, 'admin-platform')).body.audience, 'admin-platform');
  assert.equal((await auth.readSession(domain.token, 'admin-domain')).body.audience, 'admin-domain');
});

test('same browser admin re-login replaces the current cookie session only', async () => {
  const { auth } = createAuth();
  await auth.bootstrapPlatformOperator({
    loginName: 'platform-operator',
    password: 'correct-horse'
  });
  const first = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse',
    audience: 'admin-platform'
  });
  const other = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse',
    audience: 'admin-platform'
  });
  const replaced = await auth.adminLogin({
    loginName: 'platform-operator',
    password: 'correct-horse',
    audience: 'admin-platform',
    currentToken: first.token
  });
  await assert.rejects(
    () => auth.readSession(first.token, 'admin-platform'),
    (error) => error instanceof AuthError && error.code === 'unauthorized'
  );
  assert.equal((await auth.readSession(other.token, 'admin-platform')).body.account.id, other.account.id);
  assert.equal((await auth.readSession(replaced.token, 'admin-platform')).body.account.id, replaced.account.id);
});

test('miniprogram token cannot be used as an admin session', async (t) => {
  const { auth } = createAuth();
  const wechat = await auth.wechatLogin({ code: 'new-user' });
  const base = await listen(t, auth);

  const asAdmin = await jsonRequest(base, '/api/auth/me', {
    token: wechat.token,
    audience: 'admin-platform'
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
  assert.equal(missing.body.audience, 'admin-platform');

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

  const viaQuery = await jsonRequest(base, '/api/auth/me?audience=admin-platform', {
    token: login.token
  });
  assert.equal(viaQuery.status, 200);
  assert.equal(viaQuery.body.roles.platformOperator, true);

  const viaSessionHeader = await jsonRequest(base, '/api/auth/me', {
    audience: 'admin-platform',
    headers: { 'x-vquan-session': login.token }
  });
  assert.equal(viaSessionHeader.status, 200);
  assert.equal(viaSessionHeader.body.account.id, login.account.id);
});
