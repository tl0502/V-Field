import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, basename, resolve } from 'node:path';
import test from 'node:test';
import { Pool } from 'pg';
import { parseDatabaseUrl } from '../src/database-url.js';
import { runMigrations } from '../src/migrate.js';
import { createAuthService } from '../src/auth.js';
import { createIdentityRepository } from '../src/repository.js';
import { createCommunityRepository } from '../src/community-repository.js';
import { createApp } from '../src/server.js';
import { PRESET_AUTO_DOMAIN } from '../src/config.js';
import { DEFAULT_RULES } from '../../../packages/content-core/src/index.js';
import { testDatabaseUrl } from './test-database.js';

const databaseUrl = testDatabaseUrl();
const skip = databaseUrl ? false : 'Use npm run test:postgres for isolated PostgreSQL checks';
const domainId = PRESET_AUTO_DOMAIN.id;
const password = 'p3-test-password-only-12345';

async function fixture(t, migrate = true) {
  const config = parseDatabaseUrl(databaseUrl);
  const admin = new Pool(config);
  const schema = `p3_test_${randomUUID().replaceAll('-', '')}`;
  await admin.query(`CREATE SCHEMA ${schema}`);
  const pool = new Pool({ ...config, options: `-c search_path=${schema}` });
  t.after(async () => {
    await pool.end();
    try { await admin.query(`DROP SCHEMA ${schema} CASCADE`); } finally { await admin.end(); }
  });
  if (migrate) await runMigrations(pool);
  const repository = createIdentityRepository(pool);
  const auth = createAuthService({ repository, appId: 'p3-test', sessionTtlMs: 600_000,
    wechatClient: { async code2Session(code) { return { openid: code, unionid: null }; } } });
  const community = createCommunityRepository(pool);
  return { pool, auth, community, repository };
}

async function setup(t) {
  const env = await fixture(t);
  const { auth, community } = env;
  const platform = await auth.bootstrapPlatformOperator({ loginName: 'platform-operator', password });
  const operator = await auth.wechatLogin({ code: 'operator' });
  const member = await auth.wechatLogin({ code: 'member' });
  await community.assignOperator(platform.accountId, domainId, { userId: operator.account.userId, password });
  const application = await community.applyToJoin(member.account.id, domainId);
  await community.decideJoin(operator.account.id, domainId, application.application.id, 'approved');
  const { type } = await community.saveType(operator.account.id, domainId, null, { name: '普通文章', enabled: true, rules: DEFAULT_RULES });
  return { ...env, platform, operator, member, type };
}

const articleInput = (type, options = {}) => ({ operationId: randomUUID(), typeId: type.id, typeVersion: type.version, title: '这是一篇汽车信息',
  blocks: [{ id: 'text-1', type: 'text', version: 1, text: '自由正文\n价格 12.50' }], tags: [], ...options });

test('P3 migration backfills public numbers once without changing existing identities', { skip }, async (t) => {
  const { pool } = await fixture(t, false);
  const directory = await mkdtemp(join(tmpdir(), 'vquan-p2-migrations-'));
  t.after(() => {
    if (dirname(resolve(directory)) !== resolve(tmpdir()) || !basename(directory).startsWith('vquan-p2-migrations-')) throw new Error('Unexpected temporary migration directory');
    return rm(directory, { recursive: true, force: true });
  });
  for (const name of ['001_identity.sql', '002_admin_session_audience.sql']) await copyFile(new URL(`../migrations/${name}`, import.meta.url), join(directory, name));
  await runMigrations(pool, directory);
  const id = randomUUID();
  await pool.query("INSERT INTO platform_accounts (id, status, created_at, updated_at) VALUES ($1, 'active', now(), now())", [id]);
  await pool.query('INSERT INTO wechat_identities (id, account_id, app_id, openid, first_bound_at, last_login_at) VALUES ($1, $2, $3, $4, now(), now())', [randomUUID(), id, 'test', 'retained']);
  await runMigrations(pool);
  const first = (await pool.query('SELECT id, user_id FROM platform_accounts')).rows[0];
  assert.equal(first.id, id);
  assert.match(first.user_id, /^[1-9][0-9]{7}$/);
  assert.equal((await pool.query('SELECT account_id FROM wechat_identities')).rows[0].account_id, id);
  assert.deepEqual(await runMigrations(pool), []);
  assert.deepEqual((await pool.query('SELECT id, user_id FROM platform_accounts')).rows[0], first);
  await assert.rejects(pool.query('UPDATE platform_accounts SET user_id = $2 WHERE id = $1', [id, first.user_id === '11111111' ? '22222222' : '11111111']), { code: '23514' });
  const legacyInsert = await pool.query("INSERT INTO platform_accounts (id, status, created_at, updated_at) VALUES ($1, 'active', now(), now()) RETURNING user_id", [randomUUID()]);
  assert.match(legacyInsert.rows[0].user_id, /^[1-9][0-9]{7}$/);
  assert.notEqual(legacyInsert.rows[0].user_id, first.user_id);
});

test('public number collisions retry and concurrent first WeChat logins create one stable identity', { skip }, async (t) => {
  const { pool, auth } = await fixture(t);
  const candidates = ['12345678', '12345678', '87654321'];
  const repository = createIdentityRepository(pool, { generateUserId: () => candidates.shift() });
  for (const openid of ['first', 'second']) await repository.createWechatAccount({ accountId: randomUUID(), identityId: randomUUID(), appId: 'collision', openid, now: new Date() });
  assert.deepEqual((await pool.query('SELECT user_id FROM platform_accounts ORDER BY user_id')).rows.map((r) => r.user_id), ['12345678', '87654321']);
  const logins = await Promise.all(Array.from({ length: 5 }, () => auth.wechatLogin({ code: 'same-real-identity' })));
  assert.equal(new Set(logins.map((r) => r.account.id)).size, 1);
  assert.equal(new Set(logins.map((r) => r.account.userId)).size, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM platform_accounts')).rows[0].n, 3);
});

test('operator assignment, numeric management login, approval, publish and visitor read form one loop', { skip }, async (t) => {
  const { auth, community, pool, platform, operator, member, type } = await setup(t);
  const target = await community.findManagementUser(platform.accountId, operator.account.userId);
  assert.equal(target.user.hasManagementCredential, true);
  const login = await auth.adminLogin({ loginName: operator.account.userId, password, audience: 'admin-domain' });
  assert.equal(login.account.id, operator.account.id);
  const again = await community.assignOperator(platform.accountId, domainId, { userId: operator.account.userId, password: 'a-different-password-12345' });
  assert.equal(again.alreadyGranted, true);
  assert.equal(again.credentialCreated, false);
  assert.equal(again.submittedPasswordValid, false);
  assert.equal((await auth.adminLogin({ loginName: operator.account.userId, password, audience: 'admin-domain' })).account.id, operator.account.id);
  const input = articleInput(type, { tags: [{ name: ' 新车 ' }] });
  const results = await Promise.all([community.publish(member.account.id, domainId, input), community.publish(member.account.id, domainId, input)]);
  assert.equal(results[0].article.id, results[1].article.id);
  const read = (await community.getArticle(results[0].article.id)).article;
  assert.deepEqual(read.author, { userId: member.account.userId });
  assert.equal(JSON.stringify(read).includes(member.account.id), false);
  assert.equal(read.blocks[0].text, input.blocks[0].text);
  assert.equal(read.domain.id, domainId);
  assert.equal(read.tags[0].name, '新车');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM articles')).rows[0].n, 1);
  assert.equal((await community.listTags(operator.account.id, domainId)).tags[0].source, 'member');
});

test('cancellation and approval races produce one consistent result; rejected or cancelled users can reapply', { skip }, async (t) => {
  const { auth, community, operator, pool } = await setup(t);
  for (let i = 0; i < 4; i++) {
    const applicant = await auth.wechatLogin({ code: `applicant-${i}` });
    const applications = await Promise.all([community.applyToJoin(applicant.account.id, domainId), community.applyToJoin(applicant.account.id, domainId)]);
    assert.equal(applications[0].application.id, applications[1].application.id);
    const requestId = applications[0].application.id;
    await Promise.all([community.cancelJoin(applicant.account.id, domainId, requestId), community.decideJoin(operator.account.id, domainId, requestId, 'approved')]);
    const state = await community.getJoinState(applicant.account.id, domainId);
    assert.equal(state.member, state.application.status === 'approved');
    if (!state.member) assert.notEqual((await community.applyToJoin(applicant.account.id, domainId)).application.id, requestId);
  }
  const applicant = await auth.wechatLogin({ code: 'rejected' });
  const old = await community.applyToJoin(applicant.account.id, domainId);
  await community.decideJoin(operator.account.id, domainId, old.application.id, 'rejected');
  const next = await community.applyToJoin(applicant.account.id, domainId);
  assert.notEqual(next.application.id, old.application.id);
  assert.equal((await pool.query('SELECT status FROM domain_join_requests WHERE id = $1', [old.application.id])).rows[0].status, 'rejected');
});

test('HTTP cookie approval supports an operator applying, cancelling, reapplying and deciding their own membership', { skip }, async (t) => {
  const { auth, community, operator, pool } = await setup(t);
  const server = createApp({ auth, community });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = await fetch(`${base}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-vquan-audience': 'admin-domain' },
    body: JSON.stringify({ loginName: operator.account.userId, password })
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie').split(';', 1)[0];
  await login.json();

  async function request(path, { body, admin = false } = {}) {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        'x-vquan-audience': admin ? 'admin-domain' : 'miniprogram',
        ...(admin ? { cookie } : { authorization: `Bearer ${operator.token}` })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    assert.equal(response.headers.get('content-type'), 'application/json');
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    return result;
  }

  const joinPath = `/api/domains/${domainId}/join-requests`;
  const reviewPath = `/api/admin/domain/${domainId}/join-requests`;
  const first = await request(joinPath, { body: {} });
  const cancelled = await request(`${joinPath}/${first.application.id}/cancel`, { body: {} });
  assert.equal(cancelled.application.status, 'cancelled');
  const second = await request(joinPath, { body: {} });
  assert.notEqual(second.application.id, first.application.id);
  assert.deepEqual((await request(reviewPath, { admin: true })).requests.map((item) => item.id), [second.application.id]);
  const reject = await request(`${reviewPath}/${second.application.id}/decision`, { admin: true, body: { decision: 'rejected' } });
  assert.equal(reject.status, 'rejected');
  const staleApproval = await request(`${reviewPath}/${second.application.id}/decision`, { admin: true, body: { decision: 'approved' } });
  assert.equal(staleApproval.status, 'rejected');
  assert.equal((await request(`/api/domains/${domainId}/join-state`)).member, false);

  const third = await request(joinPath, { body: {} });
  assert.notEqual(third.application.id, second.application.id);
  const approvalPath = `${reviewPath}/${third.application.id}/decision`;
  assert.equal((await request(approvalPath, { admin: true, body: { decision: 'approved' } })).status, 'approved');
  assert.equal((await request(approvalPath, { admin: true, body: { decision: 'approved' } })).status, 'approved');
  const state = await request(`/api/domains/${domainId}/join-state`);
  assert.equal(state.member, true);
  assert.equal(state.application.status, 'approved');
  assert.equal((await request(reviewPath, { admin: true })).requests.length, 0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM domain_memberships WHERE account_id = $1 AND domain_id = $2', [operator.account.id, domainId])).rows[0].n, 1);
  assert.deepEqual((await pool.query('SELECT status, decided_by FROM domain_join_requests WHERE account_id = $1 ORDER BY created_at', [operator.account.id])).rows, [
    { status: 'cancelled', decided_by: operator.account.id },
    { status: 'rejected', decided_by: operator.account.id },
    { status: 'approved', decided_by: operator.account.id }
  ]);
});

test('permissions are checked independently, cross-domain tags fail atomically, and public lookup stays minimal', { skip }, async (t) => {
  const { auth, community, pool, member, operator, platform, type } = await setup(t);
  const outsider = await auth.wechatLogin({ code: 'outsider' });
  await assert.rejects(community.findManagementUser(member.account.id, operator.account.userId), { code: 'platform_permission_required' });
  await assert.rejects(community.publish(operator.account.id, domainId, articleInput(type)), { code: 'membership_required' });
  await assert.rejects(community.publish(outsider.account.id, domainId, articleInput(type)), { code: 'membership_required' });
  await assert.rejects(community.saveType(member.account.id, domainId, null, { name: '越权', enabled: true, rules: DEFAULT_RULES }), { code: 'domain_permission_required' });
  assert.deepEqual(await community.findPublicUser(member.account.id, operator.account.userId), { user: { userId: operator.account.userId } });
  await pool.query("UPDATE platform_accounts SET status = 'disabled' WHERE id = $1", [outsider.account.id]);
  assert.deepEqual(await community.findPublicUser(member.account.id, outsider.account.userId), { user: null });
  const otherDomain = randomUUID();
  await pool.query("INSERT INTO business_domains (id, slug, name, status, created_at) VALUES ($1, 'other', '隔离域', 'active', now())", [otherDomain]);
  await community.assignOperator(platform.accountId, otherDomain, { userId: operator.account.userId });
  const foreignTag = (await community.createTag(operator.account.id, otherDomain, '异域标签')).tag;
  await assert.rejects(community.publish(member.account.id, domainId, articleInput(type, { tags: [{ name: '必须回滚' }, { id: foreignTag.id }] })), { code: 'tag_unavailable' });
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM domain_tags WHERE name = '必须回滚'")).rows[0].n, 0);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM articles')).rows[0].n, 0);
});

test('type and tag changes reject stale drafts while published snapshots stay readable', { skip }, async (t) => {
  const { community, member, operator, type, pool } = await setup(t);
  const input = articleInput(type, { tags: [{ name: ' New   Car ' }] });
  const first = await community.publish(member.account.id, domainId, input);
  const sameName = await community.publish(member.account.id, domainId, articleInput(type, { tags: [{ name: 'new car' }] }));
  assert.equal(first.article.tags[0].id, sameName.article.tags[0].id);
  assert.equal(sameName.article.tags[0].name, 'New Car');
  await community.disableTag(operator.account.id, domainId, first.article.tags[0].id);
  await assert.rejects(community.publish(member.account.id, domainId, articleInput(type, { tags: [{ name: 'NEW CAR' }] })), { code: 'tag_unavailable' });
  const changed = (await community.saveType(operator.account.id, domainId, type.id, { name: '新类型名', version: type.version, enabled: false, rules: DEFAULT_RULES })).type;
  assert.equal(changed.version, 2);
  await assert.rejects(community.publish(member.account.id, domainId, articleInput(type)), { code: 'type_changed' });
  const historical = (await community.getArticle(first.article.id)).article;
  assert.equal(historical.type.name, '普通文章');
  assert.equal(historical.tags[0].name, 'New Car');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM articles')).rows[0].n, 2);
  assert.equal((await community.publish(member.account.id, domainId, input)).article.id, first.article.id);
});

test('concurrent normalized tag creation reuses one record without overwriting its display name or creator', { skip }, async (t) => {
  const { community, member, type, pool } = await setup(t);
  const results = await Promise.all(['New Car', 'new car', ' NEW   CAR '].map((name) => community.publish(member.account.id, domainId, articleInput(type, { tags: [{ name }] }))));
  assert.equal(new Set(results.map((r) => r.article.tags[0].id)).size, 1);
  assert.equal(new Set(results.map((r) => r.article.tags[0].name)).size, 1);
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM domain_tags')).rows[0].n, 1);
});

test('author deletion makes old public links unreadable and never grants other users deletion rights', { skip }, async (t) => {
  const { community, member, operator, type } = await setup(t);
  const { article } = await community.publish(member.account.id, domainId, articleInput(type));
  await assert.rejects(community.deleteArticle(operator.account.id, article.id), { code: 'author_permission_required' });
  await community.deleteArticle(member.account.id, article.id);
  assert.equal((await community.deleteArticle(member.account.id, article.id)).deleted, true);
  await assert.rejects(community.getArticle(article.id), { code: 'article_unavailable' });
  assert.equal((await community.listArticles(domainId)).articles.length, 0);
});

test('HTTP admits maximum legal Unicode content, preserves identity limits and isolates audiences', { skip }, async (t) => {
  const { auth, community, member, operator, type } = await setup(t);
  const server = createApp({ auth, community });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const maximum = articleInput(type, { title: '🚗'.repeat(80), blocks: [
    { id: 'body', type: 'text', version: 1, text: '🚗'.repeat(20_000) },
    ...Array.from({ length: 50 }, (_, i) => ({ id: `car-${i}`, type: 'car', version: 1, description: '🚗'.repeat(2_000) }))
  ] });
  const send = (path, body, token = member.token) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const published = await send(`/api/domains/${domainId}/articles`, maximum);
  assert.equal(published.status, 200);
  const { article } = await published.json();
  assert.deepEqual(article.blocks, maximum.blocks);
  assert.equal((await send('/api/auth/wechat/login', { code: 'x'.repeat(65536) })).status, 413);
  assert.equal((await send(`/api/domains/${domainId}/articles`, { padding: 'x'.repeat(1024 * 1024) })).status, 413);
  const lookup = await fetch(`${base}/api/users/by-user-id/${operator.account.userId}`, { headers: { authorization: `Bearer ${member.token}` } });
  assert.deepEqual(await lookup.json(), { user: { userId: operator.account.userId } });
  assert.equal((await fetch(`${base}/api/admin/platform/accounts/${operator.account.userId}`, { headers: { authorization: `Bearer ${member.token}`, 'x-vquan-audience': 'admin-platform' } })).status, 401);
  assert.equal((await fetch(`${base}/api/users/by-user-id/${operator.account.userId}`)).status, 401);
});

test('feed pagination retains records separated only by PostgreSQL microseconds', { skip }, async (t) => {
  const { community, member, type, pool } = await setup(t);
  for (let i = 0; i < 25; i++) await community.publish(member.account.id, domainId, articleInput(type, { title: `文章 ${i}` }));
  await pool.query(`UPDATE articles a SET created_at = '2026-09-14 12:00:00.123000+00'::timestamptz + n.row_num * interval '1 microsecond'
    FROM (SELECT id, row_number() OVER (ORDER BY id) AS row_num FROM articles) n WHERE a.id = n.id`);
  const first = await community.listArticles(domainId);
  const second = await community.listArticles(domainId, first.nextCursor);
  assert.equal(first.articles.length, 20);
  assert.equal(second.articles.length, 5);
  assert.equal(new Set([...first.articles, ...second.articles].map((a) => a.id)).size, 25);
});

test('approving a disabled applicant returns a business conflict without invalidating the operator session', { skip }, async (t) => {
  const { community, operator, auth, pool } = await setup(t);
  const applicant = await auth.wechatLogin({ code: 'disabled-applicant' });
  const state = await community.applyToJoin(applicant.account.id, domainId);
  const operatorLogin = await auth.adminLogin({ loginName: operator.account.userId, password, audience: 'admin-domain' });
  await pool.query("UPDATE platform_accounts SET status = 'disabled' WHERE id = $1", [applicant.account.id]);
  await assert.rejects(community.decideJoin(operator.account.id, domainId, state.application.id, 'approved'), (error) => error.code === 'target_account_unavailable' && error.statusCode === 409);
  assert.equal((await auth.readSession(operatorLogin.token, 'admin-domain')).account.id, operator.account.id);
  assert.equal((await pool.query('SELECT status FROM domain_join_requests WHERE id = $1', [state.application.id])).rows[0].status, 'pending');
  assert.equal((await pool.query('SELECT count(*)::int AS n FROM domain_memberships WHERE account_id = $1', [applicant.account.id])).rows[0].n, 0);
});

test('rechecking a published intent after rule refresh returns the original article and protects its receipt', { skip }, async (t) => {
  const { community, operator, member, type } = await setup(t);
  const input = articleInput(type);
  const first = await community.publish(member.account.id, domainId, input);
  const changed = await community.saveType(operator.account.id, domainId, type.id, { name: '更名后的类型', enabled: true, version: type.version, rules: DEFAULT_RULES });
  const retry = await community.publish(member.account.id, domainId, { ...input, typeVersion: changed.type.version });
  assert.equal(retry.article.id, first.article.id);
  assert.equal((await community.getSubmission(member.account.id, domainId, input.operationId)).article.id, first.article.id);
  assert.deepEqual(await community.getSubmission(operator.account.id, domainId, input.operationId), { article: null, deleted: false });
  await community.deleteArticle(member.account.id, first.article.id);
  assert.deepEqual(await community.getSubmission(member.account.id, domainId, input.operationId), { article: null, deleted: true });
});
