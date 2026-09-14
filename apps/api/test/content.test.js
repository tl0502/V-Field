import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prepareArticle, validateType, normalizeName, articleRuleIssues, DEFAULT_RULES, codePointLength } from '../../../packages/content-core/src/index.js';

const input = () => ({ operationId: randomUUID(), typeId: randomUUID(), typeVersion: 1, title: '标题', blocks: [{ id: 'a', type: 'text', version: 1, text: '正文' }], tags: [] });

test('content boundaries count Unicode code points and preserve line breaks and ordered cards', () => {
  const value = input();
  value.title = '🚗'.repeat(80);
  value.blocks = [
    { id: 'a', type: 'text', version: 1, text: '第一行\r\n\n' },
    { id: 'b', type: 'car', version: 1, description: '报价 12.50 万\r\n里程 0' },
    { id: 'c', type: 'text', version: 1, text: '\n末尾 🚗' }
  ];
  const article = prepareArticle(value);
  assert.equal(codePointLength(article.title), 80);
  assert.deepEqual(article.blocks.map((b) => b.id), ['a', 'b', 'c']);
  assert.equal(article.blocks[0].text, '第一行\n\n');
  assert.equal(article.blocks[1].description, '报价 12.50 万\n里程 0');
  assert.throws(() => prepareArticle({ ...value, title: value.title + '🚗' }), { code: 'validation_failed' });
});

test('unsupported media, duplicate block IDs, empty articles and invalid Unicode are rejected', () => {
  const value = input();
  for (const blocks of [[], [{ ...value.blocks[0], text: ' \n ' }], [...value.blocks, ...value.blocks],
    [{ ...value.blocks[0], image: 'https://invalid/image.png' }], [{ ...value.blocks[0], version: 2 }],
    [{ ...value.blocks[0], text: '\u0000' }], [{ ...value.blocks[0], text: '\ud800' }]]) {
    assert.throws(() => prepareArticle({ ...value, blocks }), { code: 'validation_failed' });
  }
});

test('domain template rules cannot contradict one another and pure text remains possible', () => {
  const valid = validateType({ name: ' 通用文章 ', enabled: true, rules: DEFAULT_RULES });
  assert.equal(valid.name, '通用文章');
  assert.deepEqual(articleRuleIssues(input().blocks, valid.rules), []);
  const carRequired = { text: { enabled: true, required: false }, car: { enabled: true, min: 1, max: 2 } };
  assert.equal(articleRuleIssues(input().blocks, carRequired).length, 1);
  for (const rules of [
    { text: { enabled: false, required: true }, car: { enabled: true, min: 1, max: 2 } },
    { text: { enabled: false, required: false }, car: { enabled: false, min: 0, max: 0 } },
    { text: { enabled: true, required: true }, car: { enabled: true, min: 5, max: 2 } }
  ]) assert.throws(() => validateType({ name: '规则', enabled: true, rules }), { code: 'validation_failed' });
  assert.equal(normalizeName('  NEW   Car  '), 'new car');
});
