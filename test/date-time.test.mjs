import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const helperUrl = new URL('./helpers/vue-component.mjs', import.meta.url).href;
const timestamps = ['2026-09-14T23:30:00Z', '2026-09-14T01:05:00Z', '2026-01-01T00:30:00Z', '2026-09-15T07:30:00+08:00'];
const script = `
  import * as vue from 'vue';
  import { componentHarness, hasClass } from ${JSON.stringify(helperUrl)};
  const article = vue.shallowRef(null);
  const h = componentHarness({
    '@dcloudio/uni-app': { onLoad() {}, onShow() {} },
    '../../composables/useArticleDetail': { useArticleDetail: () => ({ article, busy: vue.ref(false), deleting: vue.ref(false), error: vue.ref(''), unavailable: vue.ref(false), isAuthor: vue.ref(false), load() {}, remove() {} }) },
    '../../composables/useMiniprogramSession': { useMiniprogramSession: () => ({ refresh() {} }) }
  });
  const { formatLocalTimestamp } = h.load('apps/miniprogram/src/utils/dateTime.ts');
  const results = ${JSON.stringify(timestamps)}.map((createdAt) => {
    article.value = { id: 'article', title: '文章', excerpt: '正文', createdAt, author: { userId: '12345678' }, domain: { name: '测试域' }, type: { name: '通用文章' }, tags: [], blocks: [] };
    const feed = h.mount('apps/miniprogram/src/components/community/FeedItem.vue', { article: article.value });
    const detail = h.mount('apps/miniprogram/src/pages/detail/detail.vue');
    const result = { date: formatLocalTimestamp(createdAt, 'date'), minute: formatLocalTimestamp(createdAt), feed: feed.find(hasClass('feed-time')).text, detail: detail.find(hasClass('article-meta')).text };
    feed.close(); detail.close();
    return result;
  });
  console.log(JSON.stringify({ results, invalid: [null, undefined, '', ' ', 'not-a-timestamp', '2026-13-01T00:00:00Z'].map((value) => formatLocalTimestamp(value)) }));
`;

for (const [timezone, expected] of [
  ['Asia/Shanghai', ['2026-09-15 07:30', '2026-09-14 09:05', '2026-01-01 08:30', '2026-09-15 07:30']],
  ['America/New_York', ['2026-09-14 19:30', '2026-09-13 21:05', '2025-12-31 19:30', '2026-09-14 19:30']],
  ['UTC', ['2026-09-14 23:30', '2026-09-14 01:05', '2026-01-01 00:30', '2026-09-14 23:30']]
]) {
  test(`feed and detail show the same local calendar date in ${timezone}`, () => {
    // A fresh process uses the real platform Date implementation in each zone;
    // expected values cover both sides of midnight, a year boundary and DST.
    const child = spawnSync(process.execPath, ['--input-type=module', '-'], {
      input: script, encoding: 'utf8', env: { ...process.env, TZ: timezone }
    });
    assert.equal(child.status, 0, child.stderr);
    const actual = JSON.parse(child.stdout);
    assert.deepEqual(actual.results, expected.map((minute) => ({
      date: minute.split(' ')[0], minute, feed: minute.split(' ')[0], detail: `测试域 · ${minute}`
    })));
    assert.deepEqual(actual.invalid, Array(6).fill('时间未知'));
  });
}
