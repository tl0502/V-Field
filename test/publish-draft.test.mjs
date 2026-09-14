import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import * as vue from 'vue';
import * as content from '../packages/content-core/src/index.js';

class SessionRequestError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
const domainId = '8b1c0e2a-4d3f-4a6b-9c1d-0e2f3a4b5c6d';
const typeId = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness(shared = {}) {
  const storage = shared.storage ?? new Map();
  const articles = shared.articles ?? new Map();
  const api = shared.api ?? { version: 1, posts: 0, loseResponse: true, commitBeforeLoss: true };
  const lifecycle = [];
  const me = vue.shallowRef({ account: { id: actorId, userId: '12345678' } });
  const request = async (path, options) => {
    if (path.endsWith('/types')) return { types: [{ id: typeId, name: '文章类型', version: api.version, enabled: true, rules: content.DEFAULT_RULES }] };
    if (path.endsWith('/tags')) return { tags: [] };
    if (path.includes('/submissions/')) return { article: articles.get(path.split('/').at(-1)) ?? null, deleted: false };
    if (path.endsWith('/articles')) {
      api.posts++;
      const input = options.body;
      if (input.typeVersion !== api.version) throw new SessionRequestError('type_changed', 409);
      const article = { id: `article-${articles.size + 1}`, ...input };
      if (!api.loseResponse || api.commitBeforeLoss) articles.set(input.operationId, article);
      if (api.loseResponse) { api.loseResponse = false; throw new Error('network_timeout'); }
      if (api.hold) await api.hold;
      return { article };
    }
    throw new Error(`Unexpected path ${path}`);
  };
  const context = vm.createContext({
    console, Error, setTimeout, clearTimeout,
    uni: {
      getStorageSync: (key) => storage.get(key),
      setStorageSync: (key, value) => storage.set(key, value),
      removeStorageSync: (key) => storage.delete(key),
      showModal: async () => ({ confirm: true }),
      redirectTo() {}, $emit() {}
    }
  });
  const filename = fileURLToPath(new URL('../apps/miniprogram/src/composables/usePublishDraft.ts', import.meta.url));
  const source = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const require = (id) => {
    if (id === 'vue') return { ...vue, onUnmounted: (fn) => lifecycle.push(fn) };
    if (id === '@dcloudio/uni-app') return { onHide() {}, onUnload() {} };
    if (id === '@vquan/content-core') return content;
    if (id === '@vquan/session-core') return { SessionRequestError };
    if (id === '../utils/requestApi') return { requestApi: async () => ({ domain: { id: domainId, name: '测试域', slug: 'auto-verify' } }) };
    if (id === './useMiniprogramSession') return { useMiniprogramSession: () => ({ me, request }) };
    throw new Error(`Unexpected import ${id}`);
  };
  vm.runInContext(`(function(require,module,exports){${source}\n})`, context, { filename })(require, module, module.exports);
  const scope = vue.effectScope();
  const draft = scope.run(() => module.exports.usePublishDraft(vue.shallowRef(domainId)));
  return { draft, api, articles, storage, me, close() { lifecycle.forEach((fn) => fn()); scope.stop(); } };
}

async function prepare(h) {
  await tick();
  assert.equal(h.draft.ready.value, true);
  h.draft.draft.value.title = '同一次发布';
  h.draft.draft.value.blocks[0].text = '正文和标签没有变化';
}

test('lost success followed by refreshed rules resolves the original submission instead of publishing twice', async () => {
  const h = harness();
  try {
    await prepare(h);
    await h.draft.publish();
    assert.equal(h.articles.size, 1);
    assert.equal(h.draft.hasPendingSubmission.value, true);
    h.api.version = 2;
    await h.draft.refreshRules();
    h.draft.acceptRules();
    await h.draft.publish();
    assert.equal(h.api.posts, 1);
    assert.equal(h.articles.size, 1);
    assert.equal(h.draft.publishedId.value, 'article-1');
  } finally { h.close(); }
});

test('an unresolved submission survives reopening the draft and a type version update', async () => {
  const first = harness();
  await prepare(first);
  await first.draft.publish();
  first.close();
  first.api.version = 2;
  const reopened = harness(first);
  try {
    await tick();
    assert.equal(reopened.draft.hasPendingSubmission.value, true);
    reopened.draft.acceptRules();
    await reopened.draft.publish();
    assert.equal(reopened.api.posts, 1);
    assert.equal(reopened.articles.size, 1);
    assert.equal(reopened.draft.publishedId.value, 'article-1');
  } finally { reopened.close(); }
});

test('a definitely rejected old rule submission can retry the updated rule without duplicating an intent', async () => {
  const h = harness();
  h.api.commitBeforeLoss = false;
  try {
    await prepare(h);
    await h.draft.publish();
    assert.equal(h.articles.size, 0);
    h.api.version = 2;
    await h.draft.refreshRules();
    h.draft.acceptRules();
    await h.draft.publish();
    assert.equal(h.draft.hasPendingSubmission.value, false);
    await h.draft.publish();
    assert.equal(h.articles.size, 1);
    assert.equal(h.draft.publishedId.value, 'article-1');
  } finally { h.close(); }
});

test('a late successful response cannot clear a draft edited after the submission began', async () => {
  const h = harness();
  h.api.loseResponse = false;
  let release;
  h.api.hold = new Promise((resolve) => { release = resolve; });
  try {
    await prepare(h);
    const pending = h.draft.publish();
    await tick();
    h.draft.draft.value.title = '之后的新编辑';
    release();
    await pending;
    assert.equal(h.draft.publishedId.value, '');
    assert.equal(h.draft.draft.value.title, '之后的新编辑');
    h.draft.persist();
    assert.equal(JSON.parse([...h.storage.values()][0]).title, '之后的新编辑');
  } finally { release(); h.close(); }
});
