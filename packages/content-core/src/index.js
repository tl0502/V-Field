export { editorId, emptyText, ensureTextSlots, insertCarAtCursor, removeCar, swapCars, draftStorageKey, decodeDraft } from './editor.js';
export const USER_ID_PATTERN = /^[1-9][0-9]{7}$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const LIMITS = Object.freeze({ title: 80, text: 20_000, car: 2_000, cars: 50, tag: 24, tags: 6, type: 32 });
export const DEFAULT_RULES = Object.freeze({
  text: Object.freeze({ enabled: true, required: true }),
  car: Object.freeze({ enabled: true, min: 0, max: 50 })
});
export const TEMPLATES = Object.freeze([
  { type: 'text', version: 1, name: '正文', fields: ['text'] },
  { type: 'car', version: 1, name: '车源卡片', fields: ['description'] }
]);

export class ContentValidationError extends Error {
  constructor(issues) {
    super(issues.join('；'));
    this.name = 'ContentValidationError';
    this.code = 'validation_failed';
    this.issues = issues;
  }
}

export const codePointLength = (value) => [...value].length;
export const normalizeLines = (value) => value.replace(/\r\n?/g, '\n');
export const normalizeName = (value) => value.trim().replace(/\s+/gu, ' ').replace(/[A-Z]/g, (c) => c.toLowerCase());
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) => object(value) && Object.keys(value).every((key) => keys.includes(key));
const validUnicode = (value) => ![...value].some((c) => {
  const point = c.codePointAt(0);
  return point >= 0xd800 && point <= 0xdfff;
});

function singleLine(value, max, label) {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value) || !validUnicode(value)) {
    throw new ContentValidationError([`${label}须为单行文字`]);
  }
  const result = value.trim();
  if (!result || codePointLength(result) > max) throw new ContentValidationError([`${label}须为 1–${max} 个字符`]);
  return result;
}

export function validateTagName(value) {
  return singleLine(value, LIMITS.tag, '标签').replace(/\s+/gu, ' ');
}

export function validateType(input) {
  if (!exactKeys(input, ['name', 'enabled', 'version', 'rules']) || typeof input.enabled !== 'boolean') {
    throw new ContentValidationError(['文章类型参数不完整']);
  }
  const name = singleLine(input.name, LIMITS.type, '类型名称').replace(/\s+/gu, ' ');
  const rules = input.rules;
  if (!exactKeys(rules, ['text', 'car']) || !exactKeys(rules.text, ['enabled', 'required']) ||
      !exactKeys(rules.car, ['enabled', 'min', 'max']) ||
      typeof rules.text.enabled !== 'boolean' || typeof rules.text.required !== 'boolean' ||
      typeof rules.car.enabled !== 'boolean' || !Number.isInteger(rules.car.min) || !Number.isInteger(rules.car.max)) {
    throw new ContentValidationError(['请完整设置正文和车源卡片规则']);
  }
  const issues = [];
  if (!rules.text.enabled && rules.text.required) issues.push('正文停用时不能设为必填');
  if (!rules.car.enabled && (rules.car.min !== 0 || rules.car.max !== 0)) issues.push('车源停用时数量上下限须为 0');
  if (rules.car.enabled && (rules.car.min < 0 || rules.car.max < 1 || rules.car.max > LIMITS.cars || rules.car.min > rules.car.max)) {
    issues.push(`车源数量须满足 0 ≤ 最少 ≤ 最多 ≤ ${LIMITS.cars}，最多至少为 1`);
  }
  if (!rules.text.enabled && (!rules.car.enabled || rules.car.min < 1)) issues.push('正文停用时须至少要求 1 张车源卡片');
  if (issues.length) throw new ContentValidationError(issues);
  return { name, normalizedName: normalizeName(name), enabled: input.enabled, rules: {
    text: { enabled: rules.text.enabled, required: rules.text.required },
    car: { enabled: rules.car.enabled, min: rules.car.min, max: rules.car.max }
  } };
}

function multiline(value, max, label, required) {
  if (typeof value !== 'string' || !validUnicode(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)) {
    throw new ContentValidationError([`${label}包含不支持的字符`]);
  }
  const result = normalizeLines(value);
  if (codePointLength(result) > max || (required && !result.trim())) throw new ContentValidationError([`${label}${required ? '须为 1–' : '不能超过 '}${max} 个字符`]);
  return result;
}

export function prepareArticle(input) {
  if (!exactKeys(input, ['operationId', 'typeId', 'typeVersion', 'title', 'blocks', 'tags']) ||
      typeof input.operationId !== 'string' || !/^[\w-]{8,80}$/.test(input.operationId) ||
      typeof input.typeId !== 'string' || !UUID_PATTERN.test(input.typeId) ||
      !Number.isInteger(input.typeVersion) || input.typeVersion < 1 || !Array.isArray(input.blocks) || !Array.isArray(input.tags)) {
    throw new ContentValidationError(['发布参数不完整，请重新核对草稿']);
  }
  const title = singleLine(input.title, LIMITS.title, '标题');
  const ids = new Set();
  const blocks = [];
  let textLength = 0;
  let cars = 0;
  for (const block of input.blocks) {
    if (!object(block) || typeof block.id !== 'string' || !/^[\w-]{1,64}$/.test(block.id) || ids.has(block.id) || block.version !== 1) {
      throw new ContentValidationError(['内容块标识重复或版本不受支持']);
    }
    ids.add(block.id);
    if (block.type === 'text' && exactKeys(block, ['id', 'type', 'version', 'text'])) {
      const text = multiline(block.text, LIMITS.text, '正文', false);
      textLength += codePointLength(text);
      if (text.length) blocks.push({ id: block.id, type: 'text', version: 1, text });
    } else if (block.type === 'car' && exactKeys(block, ['id', 'type', 'version', 'description'])) {
      const description = multiline(block.description, LIMITS.car, '车源描述', true);
      cars++;
      blocks.push({ id: block.id, type: 'car', version: 1, description });
    } else throw new ContentValidationError(['内容仅支持正文与自由描述车源卡片，不支持图片或未知字段']);
  }
  if (textLength > LIMITS.text) throw new ContentValidationError([`正文合计不能超过 ${LIMITS.text} 个字符`]);
  if (cars > LIMITS.cars) throw new ContentValidationError([`车源卡片不能超过 ${LIMITS.cars} 张`]);
  if (!cars && !blocks.some((block) => block.type === 'text' && block.text.trim())) throw new ContentValidationError(['请填写正文或添加车源卡片']);
  const tags = [];
  const tagKeys = new Set();
  for (const tag of input.tags) {
    let item;
    let key;
    if (exactKeys(tag, ['id']) && typeof tag.id === 'string' && UUID_PATTERN.test(tag.id)) {
      item = { id: tag.id }; key = `id:${tag.id.toLowerCase()}`;
    } else if (exactKeys(tag, ['name']) && typeof tag.name === 'string') {
      const name = validateTagName(tag.name);
      item = { name }; key = `name:${normalizeName(name)}`;
    } else throw new ContentValidationError(['标签参数无效']);
    if (!tagKeys.has(key)) { tagKeys.add(key); tags.push(item); }
  }
  // One logical tag may be supplied by both ID and normalized name. The final
  // six-tag limit is also checked after resolving those references in the DB.
  if (tags.length > LIMITS.tags * 2) throw new ContentValidationError([`最多选择 ${LIMITS.tags} 个不同标签`]);
  return { operationId: input.operationId, typeId: input.typeId, typeVersion: input.typeVersion, title, blocks, tags };
}

export function articleRuleIssues(blocks, rules) {
  const text = blocks.filter((block) => block.type === 'text').map((block) => block.text).join('');
  const cars = blocks.filter((block) => block.type === 'car').length;
  const issues = [];
  if (!rules.text.enabled && text.length) issues.push('当前类型不允许正文，请修改草稿');
  if (rules.text.required && !text.trim()) issues.push('当前类型要求填写正文');
  if (!rules.car.enabled && cars) issues.push('当前类型不允许车源卡片，请修改草稿');
  if (rules.car.enabled && (cars < rules.car.min || cars > rules.car.max)) issues.push(`当前类型要求 ${rules.car.min}–${rules.car.max} 张车源卡片`);
  return issues;
}

export function articleExcerpt(blocks) {
  return [...blocks.map((block) => block.type === 'text' ? block.text : block.description).join(' ').replace(/\s+/gu, ' ').trim()].slice(0, 180).join('');
}

const errorMessages = {
  unauthorized: '登录已失效，请重新登录', session_changed: '账号已切换，请重新操作',
  invalid_user_id: '请输入完整的 8 位用户号', lookup_rate_limited: '查找太频繁，请稍后再试',
  platform_permission_required: '当前账号没有平台管理权限', domain_permission_required: '当前账号没有此域的管理权限',
  membership_required: '请先申请加入当前域，批准后即可发布', domain_unavailable: '当前域不可用',
  target_account_unavailable: '目标账号不存在或已停用', management_password_required: '请生成本次管理密码后重试',
  management_password_invalid: '管理密码不符合要求，请重新生成', name_exists: '本域已存在同名记录，请使用其他名称',
  type_changed: '文章类型已变化，请核对草稿后重试', tag_unavailable: '标签已停用或不存在，请移除或改选',
  article_unavailable: '内容不存在或已被删除', author_permission_required: '只有作者可以删除这篇内容',
  join_request_not_found: '该申请不存在，请刷新列表', request_body_too_large: '内容超出提交容量，请调整后重试',
  submission_changed: '这次提交的内容已变化，请重新提交', user_id_allocation_unavailable: '暂时无法分配用户号，请稍后重试',
  invalid_response: '服务返回异常，请稍后重试'
};
export function businessErrorMessage(error, fallback = '操作未完成，请重试') {
  if (error && Array.isArray(error.issues) && error.issues.length) return error.issues.filter((issue) => typeof issue === 'string').join('；');
  return errorMessages[error?.code ?? error?.message] ?? fallback;
}
