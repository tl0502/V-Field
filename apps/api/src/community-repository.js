import { createHash, randomUUID } from 'node:crypto';
import {
  USER_ID_PATTERN, UUID_PATTERN, LIMITS, TEMPLATES, ContentValidationError,
  validateType, validateTagName, normalizeName, prepareArticle, articleRuleIssues, articleExcerpt
} from '../../../packages/content-core/src/index.js';
import { hashPassword, verifyPassword } from './crypto.js';
import { CommunityError } from './community-errors.js';

const fail = (code, status = 400, issues = []) => { throw new CommunityError(code, status, issues); };
const uuid = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) fail('invalid_id');
  return value;
};
const userId = (value) => {
  if (typeof value !== 'string' || !USER_ID_PATTERN.test(value.trim())) fail('invalid_user_id');
  return value.trim();
};
const domainView = (row) => ({ id: row.id, slug: row.slug, name: row.name });
const typeView = (row) => ({ id: row.id, domainId: row.domain_id, name: row.name, enabled: row.enabled, version: row.version, rules: row.rules });
const tagView = (row) => ({ id: row.id, name: row.name, enabled: row.enabled, source: row.source, creatorUserId: row.creator_user_id });
const requestView = (row) => row ? ({ id: row.id, userId: row.user_id, status: row.status, createdAt: row.created_at, decidedAt: row.decided_at }) : null;

export function createCommunityRepository(pool) {
  async function transaction(action) {
    for (let attempt = 0; ; attempt++) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await action(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        if (attempt < 2 && ['40001', '40P01'].includes(error.code)) continue;
        if (error.code === '23505') fail('name_exists', 409);
        throw error;
      } finally { client.release(); }
    }
  }

  async function account(client, accountId, exclusive = false) {
    const result = await client.query(`SELECT id, user_id, status FROM platform_accounts WHERE id = $1 FOR ${exclusive ? 'UPDATE' : 'SHARE'}`, [uuid(accountId)]);
    if (!result.rows[0] || result.rows[0].status !== 'active') fail('unauthorized', 401);
    return result.rows[0];
  }

  async function domain(client, domainId) {
    const result = await client.query('SELECT id, slug, name, status FROM business_domains WHERE id = $1 FOR SHARE', [uuid(domainId)]);
    if (!result.rows[0] || result.rows[0].status !== 'active') fail('domain_unavailable', 404);
    return result.rows[0];
  }

  async function platformOperator(client, accountId) {
    await account(client, accountId);
    const grant = await client.query('SELECT account_id FROM platform_operator_grants WHERE account_id = $1 FOR SHARE', [accountId]);
    if (!grant.rowCount) fail('platform_permission_required', 403);
  }

  async function domainRole(client, accountId, domainId, role) {
    await account(client, accountId);
    const currentDomain = await domain(client, domainId);
    const table = role === 'operator' ? 'domain_operator_grants' : 'domain_memberships';
    const condition = role === 'member' ? " AND status = 'active'" : '';
    const grant = await client.query(`SELECT account_id FROM ${table} WHERE account_id = $1 AND domain_id = $2${condition} FOR SHARE`, [accountId, domainId]);
    if (!grant.rowCount) fail(role === 'operator' ? 'domain_permission_required' : 'membership_required', 403);
    return currentDomain;
  }

  async function tagLock(client, domainId) {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('tags:' || $1::text, 0))", [domainId]);
  }

  async function getDomain(slug) {
    if (typeof slug !== 'string' || !/^[a-z0-9-]{1,64}$/.test(slug)) fail('domain_unavailable', 404);
    const result = await pool.query("SELECT id, slug, name FROM business_domains WHERE slug = $1 AND status = 'active'", [slug]);
    if (!result.rowCount) fail('domain_unavailable', 404);
    return { domain: domainView(result.rows[0]) };
  }

  async function findPublicUser(accountId, requestedUserId) {
    return transaction(async (client) => {
      await account(client, accountId);
      const result = await client.query("SELECT user_id FROM platform_accounts WHERE user_id = $1 AND status = 'active'", [userId(requestedUserId)]);
      return { user: result.rows[0] ? { userId: result.rows[0].user_id } : null };
    });
  }

  async function findManagementUser(actorId, requestedUserId) {
    return transaction(async (client) => {
      await platformOperator(client, actorId);
      const result = await client.query(
        `SELECT a.id, a.user_id, a.status, EXISTS (SELECT 1 FROM admin_credentials c WHERE c.account_id = a.id) AS has_credential
         FROM platform_accounts a WHERE a.user_id = $1`, [userId(requestedUserId)]
      );
      if (!result.rowCount) return { user: null };
      const row = result.rows[0];
      const grants = await client.query('SELECT domain_id FROM domain_operator_grants WHERE account_id = $1', [row.id]);
      return { user: { userId: row.user_id, status: row.status, hasManagementCredential: row.has_credential, domainOperatorDomainIds: grants.rows.map((g) => g.domain_id) } };
    });
  }

  async function assignOperator(actorId, domainId, input) {
    const targetNumber = userId(input.userId);
    const proposed = input.password;
    if (proposed !== undefined && (typeof proposed !== 'string' || proposed.length < 16 || proposed.length > 128)) fail('management_password_invalid');
    const passwordHash = proposed ? await hashPassword(proposed) : null;
    return transaction(async (client) => {
      await platformOperator(client, actorId);
      await domain(client, domainId);
      const target = await client.query('SELECT id, user_id, status FROM platform_accounts WHERE user_id = $1 FOR UPDATE', [targetNumber]);
      if (!target.rowCount || target.rows[0].status !== 'active') fail('target_account_unavailable', 404);
      const targetId = target.rows[0].id;
      const credential = await client.query('SELECT password_hash FROM admin_credentials WHERE account_id = $1', [targetId]);
      let credentialCreated = false;
      let submittedPasswordValid = false;
      if (!credential.rowCount) {
        if (!passwordHash) fail('management_password_required', 409);
        await client.query(
          `INSERT INTO admin_credentials (account_id, login_name, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, now(), now())`, [targetId, `uid_${targetNumber}`, passwordHash]
        );
        credentialCreated = true;
        submittedPasswordValid = true;
      } else if (proposed) submittedPasswordValid = await verifyPassword(proposed, credential.rows[0].password_hash);
      const grant = await client.query(
        `INSERT INTO domain_operator_grants (account_id, domain_id, granted_at, granted_by)
         VALUES ($1, $2, now(), $3) ON CONFLICT (account_id, domain_id) DO NOTHING RETURNING account_id`,
        [targetId, domainId, actorId]
      );
      return { userId: targetNumber, domainId, alreadyGranted: !grant.rowCount, credentialCreated, submittedPasswordValid };
    });
  }

  async function listManagedDomains(actorId) {
    return transaction(async (client) => {
      await account(client, actorId);
      const result = await client.query(
        `SELECT d.id, d.slug, d.name FROM business_domains d JOIN domain_operator_grants g ON g.domain_id = d.id
         WHERE g.account_id = $1 AND d.status = 'active' ORDER BY d.name, d.id`, [actorId]
      );
      return { domains: result.rows.map(domainView) };
    });
  }

  async function joinState(client, accountId, domainId) {
    const currentDomain = await domain(client, domainId);
    const membership = await client.query("SELECT 1 FROM domain_memberships WHERE account_id = $1 AND domain_id = $2 AND status = 'active'", [accountId, domainId]);
    const requests = await client.query(
      `SELECT r.*, a.user_id FROM domain_join_requests r JOIN platform_accounts a ON a.id = r.account_id
       WHERE r.account_id = $1 AND r.domain_id = $2 ORDER BY r.created_at DESC, r.id DESC LIMIT 1`, [accountId, domainId]
    );
    return { domain: domainView(currentDomain), member: Boolean(membership.rowCount), application: requestView(requests.rows[0]) };
  }

  async function getJoinState(accountId, domainId) {
    return transaction(async (client) => { await account(client, accountId); return joinState(client, accountId, domainId); });
  }

  async function applyToJoin(accountId, domainId) {
    return transaction(async (client) => {
      await account(client, accountId, true);
      const state = await joinState(client, accountId, domainId);
      if (state.member || state.application?.status === 'pending') return state;
      await client.query(
        `INSERT INTO domain_join_requests (id, account_id, domain_id, status, created_at)
         VALUES ($1, $2, $3, 'pending', clock_timestamp())`, [randomUUID(), accountId, domainId]
      );
      return joinState(client, accountId, domainId);
    });
  }

  async function cancelJoin(accountId, domainId, requestId) {
    return transaction(async (client) => {
      await account(client, accountId, true);
      await domain(client, domainId);
      const result = await client.query('SELECT status FROM domain_join_requests WHERE id = $1 AND account_id = $2 AND domain_id = $3 FOR UPDATE', [uuid(requestId), accountId, domainId]);
      if (!result.rowCount) fail('join_request_not_found', 404);
      if (result.rows[0].status === 'pending') await client.query(
        "UPDATE domain_join_requests SET status = 'cancelled', decided_at = now(), decided_by = $2 WHERE id = $1", [requestId, accountId]
      );
      return joinState(client, accountId, domainId);
    });
  }

  async function listJoinRequests(actorId, domainId) {
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, 'operator');
      const result = await client.query(
        `SELECT r.*, a.user_id FROM domain_join_requests r JOIN platform_accounts a ON a.id = r.account_id
         WHERE r.domain_id = $1 AND r.status = 'pending' ORDER BY r.created_at, r.id`, [domainId]
      );
      return { requests: result.rows.map(requestView) };
    });
  }

  async function decideJoin(actorId, domainId, requestId, decision) {
    if (!['approved', 'rejected'].includes(decision)) fail('invalid_join_decision');
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, 'operator');
      // Account before request is the same order used by cancellation and apply.
      const target = await client.query('SELECT account_id FROM domain_join_requests WHERE id = $1 AND domain_id = $2', [uuid(requestId), domainId]);
      if (!target.rowCount) fail('join_request_not_found', 404);
      const applicant = await client.query('SELECT status FROM platform_accounts WHERE id = $1 FOR UPDATE', [target.rows[0].account_id]);
      if (!applicant.rowCount || applicant.rows[0].status !== 'active') fail('target_account_unavailable', 409);
      const result = await client.query('SELECT * FROM domain_join_requests WHERE id = $1 AND domain_id = $2 FOR UPDATE', [requestId, domainId]);
      const request = result.rows[0];
      if (request.status === 'pending') {
        await client.query('UPDATE domain_join_requests SET status = $2, decided_at = now(), decided_by = $3 WHERE id = $1', [requestId, decision, actorId]);
        if (decision === 'approved') await client.query(
          `INSERT INTO domain_memberships (account_id, domain_id, status, approved_at, approved_by)
           VALUES ($1, $2, 'active', now(), $3) ON CONFLICT (account_id, domain_id)
           DO UPDATE SET status = 'active', approved_at = EXCLUDED.approved_at, approved_by = EXCLUDED.approved_by`,
          [request.account_id, domainId, actorId]
        );
      }
      return { requestId, status: request.status === 'pending' ? decision : request.status };
    });
  }

  async function listTypes(actorId, domainId, role = 'operator') {
    return transaction(async (client) => {
      const currentDomain = await domainRole(client, actorId, domainId, role);
      const result = await client.query('SELECT * FROM article_types WHERE domain_id = $1 ORDER BY created_at, id', [domainId]);
      return { domain: domainView(currentDomain), types: result.rows.map(typeView), templates: TEMPLATES };
    });
  }

  async function saveType(actorId, domainId, typeId, input) {
    const value = validateType(input);
    if (typeId && (!Number.isInteger(input.version) || input.version < 1)) fail('type_version_required');
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, 'operator');
      let result;
      if (typeId) {
        result = await client.query(
          `UPDATE article_types SET name = $3, normalized_name = $4, enabled = $5, rules = $6,
           version = version + 1, updated_at = now() WHERE id = $1 AND domain_id = $2 AND version = $7 RETURNING *`,
          [uuid(typeId), domainId, value.name, value.normalizedName, value.enabled, JSON.stringify(value.rules), input.version]
        );
        if (!result.rowCount) fail('type_changed', 409, ['文章类型已变化，请刷新后重新编辑']);
      } else result = await client.query(
        `INSERT INTO article_types (id, domain_id, name, normalized_name, enabled, rules, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, now(), now()) RETURNING *`,
        [randomUUID(), domainId, value.name, value.normalizedName, value.enabled, JSON.stringify(value.rules)]
      );
      return { type: typeView(result.rows[0]) };
    });
  }

  async function listTags(actorId, domainId, role = 'operator', query = '') {
    if (typeof query !== 'string' || [...query].length > LIMITS.tag) fail('invalid_tag_query');
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, role);
      const result = await client.query(
        `SELECT t.*, a.user_id AS creator_user_id FROM domain_tags t JOIN platform_accounts a ON a.id = t.created_by
         WHERE t.domain_id = $1 AND ($2::boolean OR t.enabled) AND strpos(t.normalized_name, $3) > 0 ORDER BY t.created_at, t.id`,
        [domainId, role === 'operator', normalizeName(query)]
      );
      return { tags: result.rows.map(tagView) };
    });
  }

  async function resolveTag(client, domainId, actorId, input, source) {
    let result;
    if (input.id) result = await client.query('SELECT * FROM domain_tags WHERE id = $1 AND domain_id = $2 FOR SHARE', [uuid(input.id), domainId]);
    else {
      const name = validateTagName(input.name);
      result = await client.query(
        `INSERT INTO domain_tags (id, domain_id, name, normalized_name, created_by, source, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now()) ON CONFLICT (domain_id, normalized_name)
         DO UPDATE SET name = domain_tags.name RETURNING *`,
        [randomUUID(), domainId, name, normalizeName(name), actorId, source]
      );
    }
    if (!result.rowCount || !result.rows[0].enabled) fail('tag_unavailable', 409, ['标签不存在或已停用，请移除或改选后重试']);
    return result.rows[0];
  }

  async function createTag(actorId, domainId, name) {
    const displayName = validateTagName(name);
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, 'operator');
      await tagLock(client, domainId);
      const tag = await resolveTag(client, domainId, actorId, { name: displayName }, 'operator');
      return { tag: tagView(tag) };
    });
  }

  async function disableTag(actorId, domainId, tagId) {
    return transaction(async (client) => {
      await domainRole(client, actorId, domainId, 'operator');
      await tagLock(client, domainId);
      const result = await client.query('UPDATE domain_tags SET enabled = false WHERE id = $1 AND domain_id = $2 RETURNING *', [uuid(tagId), domainId]);
      if (!result.rowCount) fail('tag_unavailable', 404);
      return { tag: tagView(result.rows[0]) };
    });
  }

  function presentArticle(row, withBlocks = true) {
    return {
      id: row.id, title: row.title, excerpt: row.excerpt,
      domain: { id: row.domain_id, slug: row.domain_slug, name: row.domain_name },
      author: { userId: row.author_user_id }, createdAt: row.created_at,
      type: row.type_snapshot, tags: row.tags,
      ...(withBlocks ? { blocks: row.blocks } : {})
    };
  }

  const articleSelect = `SELECT a.*, a.created_at::text AS cursor_time, d.slug AS domain_slug, d.name AS domain_name, p.user_id AS author_user_id
    FROM articles a JOIN business_domains d ON d.id = a.domain_id JOIN platform_accounts p ON p.id = a.author_id`;

  async function publish(accountId, domainId, input) {
    const article = prepareArticle(input);
    // Accepting a newer rule version does not create a new publishing intent.
    const { typeVersion: _version, ...intent } = article;
    const submissionHash = createHash('sha256').update(JSON.stringify(intent)).digest('hex');
    return transaction(async (client) => {
      await domainRole(client, accountId, domainId, 'member');
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('publish:' || $1::text || ':' || $2::text || ':' || $3::text, 0))", [accountId, domainId, article.operationId]);
      const previous = await client.query(`${articleSelect} WHERE a.author_id = $1 AND a.domain_id = $2 AND a.operation_id = $3`, [accountId, domainId, article.operationId]);
      if (previous.rowCount) {
        if (previous.rows[0].submission_hash !== submissionHash) fail('submission_changed', 409, ['该次提交内容已变化，请重新提交']);
        if (previous.rows[0].deleted_at) fail('article_unavailable', 410);
        return { article: presentArticle(previous.rows[0]), repeated: true };
      }
      const types = await client.query('SELECT * FROM article_types WHERE id = $1 AND domain_id = $2 FOR SHARE', [article.typeId, domainId]);
      const type = types.rows[0];
      if (!type || !type.enabled || type.version !== article.typeVersion) fail('type_changed', 409, ['文章类型或规则已变化，请核对保留的草稿后重试']);
      const issues = articleRuleIssues(article.blocks, type.rules);
      if (issues.length) throw new ContentValidationError(issues);
      await tagLock(client, domainId);
      const tags = [];
      const selected = new Set();
      for (const inputTag of article.tags) {
        const tag = await resolveTag(client, domainId, accountId, inputTag, 'member');
        if (!selected.has(tag.id)) { selected.add(tag.id); tags.push({ id: tag.id, name: tag.name }); }
      }
      if (tags.length > LIMITS.tags) throw new ContentValidationError([`最多选择 ${LIMITS.tags} 个不同标签`]);
      const id = randomUUID();
      const snapshot = { id: type.id, name: type.name, version: type.version, rules: type.rules, templates: TEMPLATES.map(({ type: templateType, version }) => ({ type: templateType, version })) };
      await client.query(
        `INSERT INTO articles (id, domain_id, author_id, type_id, operation_id, submission_hash, title, type_snapshot, blocks, tags, excerpt, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
        [id, domainId, accountId, type.id, article.operationId, submissionHash, article.title, JSON.stringify(snapshot), JSON.stringify(article.blocks), JSON.stringify(tags), articleExcerpt(article.blocks)]
      );
      const result = await client.query(`${articleSelect} WHERE a.id = $1`, [id]);
      return { article: presentArticle(result.rows[0]), repeated: false };
    });
  }

  async function listArticles(domainId, cursor) {
    uuid(domainId);
    let cursorTime = null;
    let cursorId = null;
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString());
        if (!Array.isArray(decoded) || decoded.length !== 2 || typeof decoded[0] !== 'string' || !Number.isFinite(Date.parse(decoded[0])) || !UUID_PATTERN.test(decoded[1])) throw new Error();
        [cursorTime, cursorId] = decoded;
      } catch { fail('invalid_cursor'); }
    }
    return transaction(async (client) => {
      const currentDomain = await domain(client, domainId);
      const result = await client.query(
        `${articleSelect} WHERE a.domain_id = $1 AND a.deleted_at IS NULL
         AND ($2::timestamptz IS NULL OR (a.created_at, a.id) < ($2::timestamptz, $3::uuid))
         ORDER BY a.created_at DESC, a.id DESC LIMIT 21`, [domainId, cursorTime, cursorId]
      );
      const rows = result.rows.slice(0, 20);
      const last = rows.at(-1);
      const nextCursor = result.rows.length > 20 ? Buffer.from(JSON.stringify([last.cursor_time, last.id])).toString('base64url') : null;
      return { domain: domainView(currentDomain), articles: rows.map((row) => presentArticle(row, false)), nextCursor };
    });
  }

  async function getArticle(articleId) {
    const result = await pool.query(`${articleSelect} WHERE a.id = $1 AND a.deleted_at IS NULL AND d.status = 'active'`, [uuid(articleId)]);
    if (!result.rowCount) fail('article_unavailable', 404);
    return { article: presentArticle(result.rows[0]) };
  }

  async function getSubmission(accountId, domainId, operationId) {
    if (typeof operationId !== 'string' || !/^[\w-]{8,80}$/.test(operationId)) fail('invalid_submission_id');
    return transaction(async (client) => {
      await account(client, accountId);
      await domain(client, domainId);
      // Wait for an in-flight transaction with this intent before reporting no result.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended('publish:' || $1::text || ':' || $2::text || ':' || $3::text, 0))", [accountId, domainId, operationId]);
      const result = await client.query(`${articleSelect} WHERE a.author_id = $1 AND a.domain_id = $2 AND a.operation_id = $3`, [accountId, domainId, operationId]);
      const row = result.rows[0];
      return { article: row && !row.deleted_at ? presentArticle(row) : null, deleted: Boolean(row?.deleted_at) };
    });
  }

  async function deleteArticle(accountId, articleId) {
    return transaction(async (client) => {
      await account(client, accountId);
      const result = await client.query('SELECT author_id, domain_id, deleted_at FROM articles WHERE id = $1 FOR UPDATE', [uuid(articleId)]);
      if (!result.rowCount) fail('article_unavailable', 404);
      if (result.rows[0].author_id !== accountId) fail('author_permission_required', 403);
      await domain(client, result.rows[0].domain_id);
      await client.query('UPDATE articles SET deleted_at = COALESCE(deleted_at, now()) WHERE id = $1', [articleId]);
      return { deleted: true, articleId };
    });
  }

  return { getDomain, findPublicUser, findManagementUser, assignOperator, listManagedDomains,
    getJoinState, applyToJoin, cancelJoin, listJoinRequests, decideJoin,
    listTypes, saveType, listTags, createTag, disableTag, publish, listArticles, getArticle, getSubmission, deleteArticle };
}
