let sequence = 0;
export function editorId(prefix = 'block') {
  return `${prefix}_${Date.now().toString(36)}_${(++sequence).toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}
export function emptyText(id = editorId()) { return { id, type: 'text', version: 1, text: '' }; }
export function ensureTextSlots(blocks) {
  const result = blocks.map((block) => ({ ...block }));
  if (!result.length || result[0].type !== 'text') result.unshift(emptyText());
  if (result[result.length - 1].type !== 'text') result.push(emptyText());
  return result;
}
export function insertCarAtCursor(blocks, focus) {
  const card = { id: editorId('car'), type: 'car', version: 1, description: '' };
  const result = blocks.map((block) => ({ ...block }));
  const index = focus ? result.findIndex((block) => block.id === focus.id && block.type === 'text') : -1;
  if (index < 0) result.push(card, emptyText());
  else {
    const source = result[index];
    let cursor = Math.max(0, Math.min(source.text.length, Number.isInteger(focus.cursor) ? focus.cursor : source.text.length));
    // WeChat textarea cursors use UTF-16 offsets; never cut an emoji in half.
    if (cursor > 0 && /[\ud800-\udbff]/.test(source.text[cursor - 1]) && /[\udc00-\udfff]/.test(source.text[cursor] ?? '')) cursor--;
    result.splice(index, 1, { ...source, text: source.text.slice(0, cursor) }, card, { ...emptyText(), text: source.text.slice(cursor) });
  }
  return { blocks: result, cardId: card.id };
}
export function removeCar(blocks, id) {
  const result = [];
  for (const block of blocks) {
    if (block.id === id && block.type === 'car') continue;
    const previous = result[result.length - 1];
    if (block.type === 'text' && previous?.type === 'text') previous.text += block.text;
    else result.push({ ...block });
  }
  return ensureTextSlots(result);
}
export function swapCars(blocks, sourceId, targetId) {
  const result = [...blocks];
  const source = result.findIndex((block) => block.type === 'car' && block.id === sourceId);
  const target = result.findIndex((block) => block.type === 'car' && block.id === targetId);
  if (source >= 0 && target >= 0) [result[source], result[target]] = [result[target], result[source]];
  return result;
}
export function draftStorageKey(accountId, domainId) { return `vquan:draft:v1:${accountId}:${domainId}`; }

export function decodeDraft(value, accountId, domainId) {
  if (value === undefined || value === null || value === '') return null;
  const draft = typeof value === 'string' ? JSON.parse(value) : value;
  if (!draft || draft.schema !== 1 || draft.accountId !== accountId || draft.domainId !== domainId ||
      typeof draft.title !== 'string' || typeof draft.typeId !== 'string' || !Number.isInteger(draft.typeVersion) ||
      typeof draft.operationId !== 'string' || !Array.isArray(draft.blocks) || !Array.isArray(draft.tags)) throw new Error('invalid_draft');
  const ids = new Set();
  for (const block of draft.blocks) {
    if (!block || typeof block.id !== 'string' || ids.has(block.id) || block.version !== 1 ||
        !(block.type === 'text' && typeof block.text === 'string' || block.type === 'car' && typeof block.description === 'string')) throw new Error('invalid_draft');
    ids.add(block.id);
  }
  for (const tag of draft.tags) if (!tag || typeof tag.name !== 'string' || (tag.id !== undefined && typeof tag.id !== 'string')) throw new Error('invalid_draft');
  if (draft.pendingSubmission && (draft.pendingSubmission.operationId !== draft.operationId || !Array.isArray(draft.pendingSubmission.blocks) || !Array.isArray(draft.pendingSubmission.tags))) throw new Error('invalid_draft');
  return draft;
}
