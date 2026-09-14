import assert from 'node:assert/strict';
import test from 'node:test';
import * as vue from 'vue';
import { componentHarness, hasClass } from './helpers/vue-component.mjs';

function editor(blocks = [{ id: 'body', type: 'text', version: 1, text: 'ABCD' }], globals = {}) {
  const draft = vue.ref({ title: '测试文章', blocks, tags: [], typeId: 'type' });
  const types = [{ id: 'type', name: '通用文章' }];
  const state = {
    draft, domain: vue.ref({ name: '测试域' }), tags: vue.ref([{ id: 'tag', name: '新能源' }]),
    availableTypes: vue.ref(types), selectedType: vue.ref(types[0]),
    rulesChanged: vue.ref(false), ruleIssues: vue.ref([]), canAddCar: vue.ref(true),
    loading: vue.ref(false), ready: vue.ref(true), submitting: vue.ref(false), error: vue.ref(''),
    storageError: vue.ref(''), saveLabel: vue.ref(''), publishedId: vue.ref(''),
    hasPendingSubmission: vue.ref(false), displayTags: vue.ref([]),
    me: vue.ref({ account: { userId: '12345678' } }),
    initialize() {}, refreshRules() {}, selectType() {}, acceptRules() {}, publishInput() {},
    persist() {}, clear() {}, publish() {}, openPublished() {}
  };
  const h = componentHarness({
    '@dcloudio/uni-app': { onShow() {} },
    '../../composables/usePublishDraft': { usePublishDraft: () => state },
    '../../composables/useMiniprogramSession': { useMiniprogramSession: () => ({ refresh() {} }) }
  }, globals);
  const page = h.mount('apps/miniprogram/src/components/editor/PublishEditor.vue', { domainId: 'domain' });
  const readBlocks = () => JSON.parse(JSON.stringify(draft.value.blocks)).map(({ type, text, description }) => ({ type, value: text ?? description }));
  async function bodyCursor() {
    const body = page.find(hasClass('body-textarea'));
    await page.fire(body, 'focus', { value: 'ABCD', cursor: 1 });
    await page.fire(body, 'input', { value: 'ABCD', cursor: 1 });
    await page.fire(body, 'blur', { value: 'ABCD', cursor: 1 });
    return body;
  }
  return { ...page, draft, readBlocks, bodyCursor, insert: () => page.fire(page.find(hasClass('insert-car')), 'click') };
}

function dragEditor() {
  const measurements = [];
  const blocks = [
    { id: 'body', type: 'text', version: 1, text: '开头😀\n' },
    { id: 'first', type: 'car', version: 1, description: '车源甲' },
    { id: 'between', type: 'text', version: 1, text: '中间\n' },
    { id: 'second', type: 'car', version: 1, description: '车源乙' },
    { id: 'tail', type: 'text', version: 1, text: '末尾' }
  ];
  const h = editor(blocks, { uni: { createSelectorQuery() { return {
    in(instance) { assert.equal(instance.$options.__name, 'BlockEditor'); return this; },
    selectAll(selector) { assert.equal(selector, '.editor-car-wrapper'); return this; },
    boundingClientRect(callback) { measurements.push(callback); return this; },
    exec() {}
  }; } } });
  const handle = h.all(hasClass('drag-handle'))[0];
  const geometry = [{ id: 'card-first', top: 239.5, bottom: 390.6 }, { id: 'card-second', top: 471.6, bottom: 622.7 }];
  return {
    ...h,
    gesture: (name, y) => h.fire(handle, name, {}, { touches: typeof y === 'number' ? [{ identifier: 1, clientX: 36, clientY: y }] : [] }),
    async measure(index, rectangles = geometry) { measurements[index](rectangles); await vue.nextTick(); },
    targets: () => h.all(hasClass('drop-target')).map((node) => node.props.id),
    ids: () => h.draft.value.blocks.map((block) => block.id)
  };
}

test('drag uses the latest pointer position when layout measurement returns after movement', async () => {
  const h = dragEditor();
  try {
    await h.gesture('touchstart', 315);
    await h.gesture('touchmove', 547);
    await h.measure(0);
    assert.deepEqual(h.targets(), ['card-second']);
    await h.gesture('touchend');
    assert.deepEqual(h.ids(), ['body', 'second', 'between', 'first', 'tail']);
    assert.deepEqual(h.draft.value.blocks.filter((block) => block.type === 'text').map((block) => block.text), ['开头😀\n', '中间\n', '末尾']);
  } finally { h.close(); }
});

test('drag with available geometry still follows subsequent pointer movement', async () => {
  const h = dragEditor();
  try {
    await h.gesture('touchstart', 315);
    await h.measure(0);
    await h.gesture('touchmove', 547);
    assert.deepEqual(h.targets(), ['card-second']);
    await h.gesture('touchend');
    assert.deepEqual(h.ids(), ['body', 'second', 'between', 'first', 'tail']);
  } finally { h.close(); }
});

test('canceling a drag clears the highlighted target without swapping cards', async () => {
  const h = dragEditor();
  try {
    await h.gesture('touchstart', 315);
    await h.measure(0);
    await h.gesture('touchmove', 547);
    assert.deepEqual(h.targets(), ['card-second']);
    await h.gesture('touchcancel');
    assert.deepEqual(h.targets(), []);
    assert.deepEqual(h.ids(), ['body', 'first', 'between', 'second', 'tail']);
  } finally { h.close(); }
});

test('an old measurement cannot overwrite a new drag of the same card after cancellation', async () => {
  const h = dragEditor();
  try {
    await h.gesture('touchstart', 315);
    await h.gesture('touchcancel');
    await h.gesture('touchstart', 315);
    await h.measure(1);
    await h.gesture('touchmove', 547);
    assert.deepEqual(h.targets(), ['card-second']);
    await h.measure(0, [{ id: 'card-first', top: 471.6, bottom: 622.7 }, { id: 'card-second', top: 780, bottom: 930 }]);
    assert.deepEqual(h.targets(), ['card-second']);
    await h.gesture('touchend');
    assert.deepEqual(h.ids(), ['body', 'second', 'between', 'first', 'tail']);
  } finally { h.close(); }
});

const appended = [{ type: 'text', value: 'ABCD' }, { type: 'car', value: '' }, { type: 'text', value: '' }];

test('body blur immediately followed by insert keeps the cursor and both text fragments', async () => {
  const h = editor();
  try {
    await h.bodyCursor();
    await h.insert();
    assert.deepEqual(h.readBlocks(), [{ type: 'text', value: 'A' }, { type: 'car', value: '' }, { type: 'text', value: 'BCD' }]);
  } finally { h.close(); }
});

test('moving from body text into the tag input makes the next card append', async () => {
  const h = editor();
  try {
    await h.bodyCursor();
    await h.fire(h.find((node) => node.tag === 'input' && node.props.placeholder === '查找或新建标签'), 'focus');
    await h.insert();
    assert.deepEqual(h.readBlocks(), appended);
  } finally { h.close(); }
});

test('selecting a tag without typing also invalidates the previous body cursor', async () => {
  const h = editor();
  try {
    await h.bodyCursor();
    await h.fire(h.find((node) => node.tag === 'button' && node.text === '#新能源'), 'click');
    assert.equal(h.draft.value.tags[0].name, '新能源');
    await h.insert();
    assert.deepEqual(h.readBlocks(), appended);
  } finally { h.close(); }
});

test('returning from tags to body text uses the newly focused cursor', async () => {
  const h = editor();
  try {
    const body = await h.bodyCursor();
    await h.fire(h.find((node) => node.tag === 'input' && node.props.placeholder === '查找或新建标签'), 'focus');
    await h.fire(body, 'focus', { value: 'ABCD', cursor: 2 });
    await h.fire(body, 'blur', { value: 'ABCD', cursor: 2 });
    await h.insert();
    assert.deepEqual(h.readBlocks(), [{ type: 'text', value: 'AB' }, { type: 'car', value: '' }, { type: 'text', value: 'CD' }]);
  } finally { h.close(); }
});

for (const event of ['click', 'change']) {
  test(`article type picker ${event} clears an old body cursor`, async () => {
    const h = editor();
    try {
      await h.bodyCursor();
      await h.fire(h.find((node) => node.tag === 'picker'), event, { value: 0 });
      await h.insert();
      assert.deepEqual(h.readBlocks(), appended);
    } finally { h.close(); }
  });
}

test('title focus clears body cursor even if an old body blur arrives afterwards', async () => {
  const h = editor();
  try {
    const body = await h.bodyCursor();
    await h.fire(h.find(hasClass('title-input')), 'focus');
    await h.fire(body, 'blur', { value: 'ABCD', cursor: 1 });
    await h.insert();
    assert.deepEqual(h.readBlocks(), appended);
  } finally { h.close(); }
});

for (const action of ['edit', 'description', 'input', 'save', 'move']) {
  test(`card ${action} interaction cannot reuse an earlier body cursor`, async () => {
    const h = editor([
      { id: 'body', type: 'text', version: 1, text: 'ABCD' },
      { id: 'existing', type: 'car', version: 1, description: action === 'input' ? '' : '已有车源' },
      { id: 'tail', type: 'text', version: 1, text: '结尾' }
    ]);
    try {
      if (action === 'save') await h.fire(h.find((node) => node.tag === 'button' && node.text === '编辑'), 'click');
      await h.bodyCursor();
      if (action === 'edit') await h.fire(h.find((node) => node.tag === 'button' && node.text === '编辑'), 'click');
      if (action === 'description') await h.fire(h.find(hasClass('vehicle-description')), 'click');
      if (action === 'input') await h.fire(h.find(hasClass('vehicle-textarea')), 'focus');
      if (action === 'save') await h.fire(h.find((node) => node.tag === 'button' && node.text === '保存'), 'click');
      if (action === 'move') await h.fire(h.find((node) => node.tag === 'button' && node.text === '上移'), 'click');
      await h.insert();
      assert.equal(h.draft.value.blocks[0].text, 'ABCD');
      assert.equal(h.draft.value.blocks[2].text, '结尾');
      assert.equal(h.draft.value.blocks[3].type, 'car');
      assert.equal(h.draft.value.blocks[4].text, '');
    } finally { h.close(); }
  });
}
