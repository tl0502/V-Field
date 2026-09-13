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
  const key = kind === 'mini' ? 'vquan.session' : 'review-admin';
  const cache = new Map();
  let pages = [{ route: 'pages/me/me' }, { route: 'pages/auth/auth' }];
  const uni = {
    getStorageSync: (name) => storage.get(name),
    setStorageSync: (name, value) => storage.set(name, value),
    removeStorageSync: (name) => storage.delete(name),
    login: async () => ({ code: 'review-code' }),
    request: (request) => queue.push(request),
    navigateBack: () => navigation.push('back'),
    switchTab: ({ url }) => navigation.push(url)
  };
  const context = vm.createContext({
    Error, console, uni,
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
      if (id === '../shell') return { adminShellConfig: () => ({ storageKey: key }) };
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
    if (kind === 'mini') request.success({ statusCode: status, data });
    else request.resolve({ ok: status < 400, status, json: async () => data });
  }
  function fail(request) {
    if (kind === 'mini') request.fail({ errMsg: 'request:fail timeout' });
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
  return { session, storage, queue, key, account, reply, fail, login, beginLogin, load, navigation,
    setPages(value) { pages = value; } };
}

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
      assert.equal(h.storage.get(h.key), 'current-token');
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
    assert.equal(h.storage.has(h.key), false);
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
    assert.equal(h.storage.get(h.key), 'new-token');
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
    assert.equal(h.storage.has(h.key), false);
  });

  test(`${kind}: failed logout is visible and retries the same credential`, async () => {
    const h = harness(kind); await h.login();
    const logout = h.session.logout(); h.reply(h.queue.shift(), { error: 'internal_error' }, 500);
    assert.equal(await logout, false);
    assert.equal(h.storage.get(h.key), 'current-token');
    assert.match(h.session.errorMessage.value, /退出登录未完成/);
    assert.equal(h.session.retryLabel.value, '重试退出');
    const retry = h.session.retry(), request = h.queue.shift();
    const headers = request.header ?? request.headers;
    assert.equal(headers.Authorization ?? headers.authorization, 'Bearer current-token');
    h.reply(request, { ok: true }); assert.equal(await retry, true);
    assert.equal(h.storage.has(h.key), false);
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
    assert.equal(h.storage.get(h.key), 'new-token');
  });

  test(`${kind}: late logout never clears a replaced stored token`, async () => {
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
    assert.equal(h.storage.has(h.key), false);
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
