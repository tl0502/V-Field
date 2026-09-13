const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
const vue = require('vue');

const root = path.resolve(__dirname, '..');
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness(kind, extraMocks = {}) {
  const storage = new Map();
  const queue = [];
  const navigation = [];
  const cloudInitializations = [];
  const key = kind === 'mini' ? 'vquan.session' : 'review-admin';
  const cache = new Map();
  let pages = [{ route: 'pages/me/me' }, { route: 'pages/auth/auth' }];
  const uni = {
    getStorageSync: (name) => storage.get(name),
    setStorageSync: (name, value) => storage.set(name, value),
    removeStorageSync: (name) => storage.delete(name),
    login: async () => ({ code: 'review-code' }),
    request: () => { throw new Error('Mini program API requests must use callContainer'); },
    navigateBack: () => navigation.push('back'),
    switchTab: ({ url }) => navigation.push(url)
  };
  const wx = {
    cloud: {
      init: (...args) => cloudInitializations.push(args),
      callContainer: (request) => new Promise((resolve, reject) => queue.push({ ...request, resolve, reject }))
    }
  };
  const context = vm.createContext({
    Error, console, uni, wx,
    getCurrentPages: () => pages,
    sessionStorage: {
      getItem: (name) => storage.get(name) ?? null,
      setItem: (name, value) => storage.set(name, value),
      removeItem: (name) => storage.delete(name)
    },
    fetch: (url, options) => new Promise((resolve, reject) => queue.push({ url, ...options, resolve, reject }))
  });
  function load(filename, source) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(source ?? fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
    }).outputText;
    const requireModule = (id) => {
      if (id in extraMocks) return extraMocks[id];
      if (id === 'vue') return vue;
      if (id === '../shell') return { adminShellConfig: () => ({ audience: 'admin-platform' }) };
      if (id === '@vquan/session-core') return load('packages/session-core/src/index.ts');
      if (id.endsWith('.vue')) return {};
      return load(path.resolve(path.dirname(filename), `${id}.ts`));
    };
    vm.runInContext(`(function(require,module,exports) {${code}\n})`, context, { filename })(requireModule, module, module.exports);
    return module.exports;
  }
  const entry = kind === 'mini'
    ? 'apps/miniprogram/src/composables/useMiniprogramSession.ts'
    : 'packages/admin-shell/src/composables/useAdminSession.ts';
  const session = Object.values(load(entry))[0]();
  const account = {
    account: { id: 'review-user', status: 'active' },
    roles: { platformOperator: kind !== 'mini', domainOperatorDomainIds: [], memberDomainIds: [] },
    audience: kind === 'mini' ? 'miniprogram' : 'admin', loginName: 'review', notDelivered: []
  };
  function reply(request, data = account, status = 200) {
    assert.ok(request, 'Expected an outgoing request');
    if (kind === 'mini') request.resolve({ statusCode: status, data: typeof data === 'string' ? data : JSON.stringify(data) });
    else request.resolve({ ok: status < 400, status, json: async () => data });
  }
  function fail(request) {
    if (kind === 'mini') request.reject({ errMsg: 'cloud.callContainer:fail timeout' });
    else request.reject(new Error('network failure'));
  }
  function beginLogin() {
    return kind === 'mini' ? session.loginWithWeChat() : session.login('review', 'review-password');
  }
  async function login(token = 'current-token') {
    const pending = beginLogin();
    await tick(); reply(queue.shift(), { ...account, token });
    await tick(); reply(queue.shift());
    assert.equal(await pending, true);
  }
  return { session, storage, queue, key, account, reply, fail, login, beginLogin, load, navigation, wx, cloudInitializations, kind,
    setPages(value) { pages = value; } };
}

function credentialHeld(h, token = 'current-token') {
  return h.kind === 'admin' ? h.session.isAuthed.value : h.storage.get(h.key) === token;
}

function credentialCleared(h) {
  return h.kind === 'admin' ? !h.session.isAuthed.value : !h.storage.has(h.key);
}

test('mini: CloudRun login, identity and logout preserve the API contract', async () => {
  const h = harness('mini');
  const { cloudRunEnv, cloudRunService } = h.load('apps/miniprogram/src/utils/config.ts');
  const login = h.beginLogin();
  await tick();
  const request = h.queue.shift();
  assert.equal(request.config.env, cloudRunEnv);
  assert.equal(request.header['X-WX-SERVICE'], cloudRunService);
  assert.equal(request.header['content-type'], 'application/json');
  assert.equal(request.path, '/api/auth/wechat/login?audience=miniprogram');
  assert.equal(request.method, 'POST');
  assert.equal(request.data.code, 'review-code');
  assert.equal(request.dataType, 'text');
  assert.ok(request.timeout > 0 && request.timeout <= 15000);
  h.reply(request, { ...h.account, token: 'cloud-token' });
  await tick();
  const identity = h.queue.shift();
  assert.equal(identity.path, '/api/auth/me?audience=miniprogram');
  assert.equal(identity.method, 'GET');
  assert.equal(identity.header.Authorization, 'Bearer cloud-token');
  assert.equal(identity.header['x-vquan-session'], 'cloud-token');
  assert.equal(identity.header['x-vquan-audience'], 'miniprogram');
  h.reply(identity);
  assert.equal(await login, true);
  const logout = h.session.logout();
  const outgoing = h.queue.shift();
  assert.equal(outgoing.path, '/api/auth/logout?audience=miniprogram');
  assert.equal(outgoing.method, 'POST');
  assert.equal(outgoing.header['X-WX-SERVICE'], cloudRunService);
  h.reply(outgoing, { ok: true });
  assert.equal(await logout, true);
  assert.equal(h.cloudInitializations.length, 1);
});

test('mini: an unavailable cloud SDK reports a useful error without a public HTTP fallback', async () => {
  const h = harness('mini');
  h.wx.cloud = undefined;
  assert.equal(await h.beginLogin(), false);
  assert.match(h.session.errorMessage.value, /更新微信/);
  assert.equal(h.queue.length, 0);
  assert.equal(h.cloudInitializations.length, 0);
});

test('mini: a malformed cloud response preserves the current session for retry', async () => {
  const h = harness('mini');
  await h.login();
  const pending = h.session.refresh();
  h.reply(h.queue.shift(), '<html>upstream unavailable</html>', 502);
  assert.equal(await pending, false);
  assert.equal(h.storage.get(h.key), 'current-token');
  assert.equal(h.session.canRetry.value, true);
  const retry = h.session.retry();
  h.reply(h.queue.shift());
  assert.equal(await retry, true);
});

for (const kind of ['mini', 'admin']) {
  for (const failure of ['network', '500']) {
    test(`${kind}: temporary ${failure} failure preserves the session and supports retry`, async () => {
      const h = harness(kind);
      await h.login();
      const pending = h.session.refresh();
      const request = h.queue.shift();
      if (failure === 'network') h.fail(request);
      else h.reply(request, { error: 'internal_error' }, 500);
      assert.equal(await pending, false);
      assert.equal(credentialHeld(h), true);
      assert.equal(h.session.isAuthed.value, true);
      assert.equal(h.session.canRetry.value, true);
      assert.match(h.session.errorMessage.value, /重试/);
      const retry = h.session.retry(); h.reply(h.queue.shift());
      assert.equal(await retry, true);
      assert.equal(h.session.errorMessage.value, '');
    });
  }

  test(`${kind}: unauthorized refresh clears the session`, async () => {
    const h = harness(kind); await h.login();
    const pending = h.session.refresh(); h.reply(h.queue.shift(), { error: 'unauthorized' }, 401);
    assert.equal(await pending, false);
    assert.equal(credentialCleared(h), true);
    assert.equal(h.session.isAuthed.value, false);
    assert.equal(h.session.canRetry.value, false);
  });

  test(`${kind}: duplicate refreshes share one request`, async () => {
    const h = harness(kind); await h.login();
    const first = h.session.refresh(), second = h.session.refresh();
    assert.equal(h.queue.length, 1);
    h.reply(h.queue.shift());
    assert.deepEqual(await Promise.all([first, second]), [true, true]);
  });

  test(`${kind}: an old refresh cannot invalidate a new login`, async () => {
    const h = harness(kind); await h.login('old-token');
    const oldRefresh = h.session.refresh(), oldRequest = h.queue.shift();
    const newLogin = h.beginLogin(); await tick();
    h.reply(oldRequest, { error: 'unauthorized' }, 401); await oldRefresh;
    h.reply(h.queue.shift(), { ...h.account, token: 'new-token' }); await tick();
    h.reply(h.queue.shift()); assert.equal(await newLogin, true);
    assert.equal(credentialHeld(h, 'new-token'), true);
    assert.equal(h.session.isAuthed.value, true);
  });

  test(`${kind}: lifecycle refresh cannot race the login identity request`, async () => {
    const h = harness(kind);
    const login = h.beginLogin(); await tick();
    h.reply(h.queue.shift(), { ...h.account, token: 'new-token' }); await tick();
    assert.equal(h.queue.length, 1);
    assert.equal(await h.session.refresh(), false);
    assert.equal(h.queue.length, 1);
    h.reply(h.queue.shift(), { error: 'unauthorized' }, 401);
    assert.equal(await login, false);
    assert.equal(h.session.isAuthed.value, false);
    assert.equal(credentialCleared(h), true);
  });

  test(`${kind}: failed logout is visible and retries the same credential`, async () => {
    const h = harness(kind); await h.login();
    const logout = h.session.logout(); h.reply(h.queue.shift(), { error: 'internal_error' }, 500);
    assert.equal(await logout, false);
    assert.equal(credentialHeld(h), true);
    assert.match(h.session.errorMessage.value, /退出登录未完成/);
    assert.equal(h.session.retryLabel.value, '重试退出');
    const retry = h.session.retry(), request = h.queue.shift();
    const headers = request.header ?? request.headers;
    if (kind === 'mini') {
      assert.equal(headers.Authorization ?? headers.authorization, 'Bearer current-token');
    } else {
      assert.equal(request.credentials, 'include');
    }
    h.reply(request, { ok: true }); assert.equal(await retry, true);
    assert.equal(credentialCleared(h), true);
    assert.equal(h.session.isAuthed.value, false);
  });

  test(`${kind}: repeated logout is coalesced and login waits for its completion`, async () => {
    const h = harness(kind); await h.login();
    const first = h.session.logout(), second = h.session.logout();
    assert.equal(h.queue.length, 1);
    assert.equal(await h.beginLogin(), false);
    assert.equal(h.queue.length, 1);
    h.reply(h.queue.shift(), { ok: true });
    assert.deepEqual(await Promise.all([first, second]), [true, true]);
    await h.login('new-token');
    assert.equal(credentialHeld(h, 'new-token'), true);
  });

  test(`${kind}: late logout never clears a replaced stored token`, async () => {
    if (kind === 'admin') return;
    const h = harness(kind); await h.login();
    const logout = h.session.logout(), request = h.queue.shift();
    h.storage.set(h.key, 'replacement-token');
    h.reply(request, { ok: true }); assert.equal(await logout, false);
    assert.equal(h.storage.get(h.key), 'replacement-token');
  });

  test(`${kind}: logout of an expired token completes`, async () => {
    const h = harness(kind); await h.login();
    const logout = h.session.logout(); h.reply(h.queue.shift(), { error: 'unauthorized' }, 401);
    assert.equal(await logout, true);
    assert.equal(credentialCleared(h), true);
  });
}

function navigationHarness() {
  const lifecycle = {};
  const h = harness('mini', {
    '@dcloudio/uni-app': Object.fromEntries(['onShow', 'onHide', 'onUnload'].map((name) => [name, (fn) => { lifecycle[name] = fn; }])),
    '../../composables/useSystemScheme': { useSystemScheme: () => ({ scheme: vue.shallowRef('light') }) }
  });
  const file = 'apps/miniprogram/src/pages/auth/auth.vue';
  const script = fs.readFileSync(path.join(root, file), 'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
  const { completeLogin } = h.load(file, `${script}\nexport { completeLogin };`);
  lifecycle.onShow();
  return { ...h, lifecycle, completeLogin };
}

test('leaving and revisiting the login page invalidates pending navigation', async () => {
  const h = navigationHarness();
  let finish;
  const pending = h.completeLogin(() => new Promise((resolve) => { finish = resolve; }));
  h.lifecycle.onHide(); h.lifecycle.onShow(); finish(true); await pending;
  assert.deepEqual(h.navigation, []);
});

test('a successful login on the active page returns to its caller', async () => {
  const h = navigationHarness();
  await h.completeLogin(async () => true);
  assert.deepEqual(h.navigation, ['back']);
});
