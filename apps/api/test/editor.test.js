import assert from 'node:assert/strict';
import test from 'node:test';
import { insertCarAtCursor, removeCar, swapCars, draftStorageKey, decodeDraft } from '../../../packages/content-core/src/index.js';

const text = (id, value) => ({ id, type: 'text', version: 1, text: value });
const car = (id, value) => ({ id, type: 'car', version: 1, description: value });

test('inserting at a UTF-16 cursor and removing the card round-trips text and intentional blank lines', () => {
  const initial = [text('body', '首行\n\n🚗下一行')];
  const inserted = insertCarAtCursor(initial, { id: 'body', cursor: 4 });
  assert.equal(inserted.blocks[0].text, '首行\n\n');
  assert.equal(inserted.blocks[2].text, '🚗下一行');
  const insideEmoji = insertCarAtCursor(initial, { id: 'body', cursor: 5 });
  assert.equal(insideEmoji.blocks[2].text, '🚗下一行');
  assert.deepEqual(removeCar(inserted.blocks, inserted.cardId), initial);
});

test('swapping cards retains every text position and stable block identity', () => {
  const initial = [text('start', '前言'), car('one', '车一'), text('middle', '\n正文中段\n'), car('two', '车二'), text('end', '末尾')];
  const swapped = swapCars(initial, 'one', 'two');
  assert.deepEqual(swapped.map((b) => b.id), ['start', 'two', 'middle', 'one', 'end']);
  assert.deepEqual(swapped.filter((b) => b.type === 'text'), initial.filter((b) => b.type === 'text'));
  assert.equal(initial[1].id, 'one');
});

test('draft storage separates accounts and domains and refuses a mismatched or damaged record', () => {
  assert.notEqual(draftStorageKey('account-a', 'domain-a'), draftStorageKey('account-b', 'domain-a'));
  assert.notEqual(draftStorageKey('account-a', 'domain-a'), draftStorageKey('account-a', 'domain-b'));
  const draft = { schema: 1, accountId: 'account-a', domainId: 'domain-a', typeId: 'type-a', typeVersion: 1, operationId: 'retry-same-operation', title: '草稿', blocks: [text('body', '正文')], tags: [] };
  assert.deepEqual(decodeDraft(JSON.stringify(draft), 'account-a', 'domain-a'), draft);
  assert.throws(() => decodeDraft(draft, 'account-b', 'domain-a'));
  assert.throws(() => decodeDraft({ ...draft, blocks: [text('body', '正文'), text('body', '重复')] }, 'account-a', 'domain-a'));
  assert.throws(() => decodeDraft('{truncated', 'account-a', 'domain-a'));
});
