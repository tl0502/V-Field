export function createIdentityRepository(pool) {
  async function countPlatformOperators() {
    const result = await pool.query('SELECT count(*)::int AS count FROM platform_operator_grants');
    return result.rows[0].count;
  }

  async function createPlatformOperator({ accountId, loginName, passwordHash, now, source = 'bootstrap' }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO platform_accounts (id, status, created_at, updated_at)
         VALUES ($1, 'active', $2, $2)`,
        [accountId, now]
      );
      await client.query(
        `INSERT INTO platform_operator_grants (account_id, granted_at, source)
         VALUES ($1, $2, $3)`,
        [accountId, now, source]
      );
      await client.query(
        `INSERT INTO admin_credentials (account_id, login_name, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $4)`,
        [accountId, loginName, passwordHash, now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function findAdminCredentialByLoginName(loginName) {
    const result = await pool.query(
      `SELECT c.account_id, c.login_name, c.password_hash, a.status
       FROM admin_credentials c
       JOIN platform_accounts a ON a.id = c.account_id
       WHERE c.login_name = $1`,
      [loginName]
    );
    return result.rows[0] ?? null;
  }

  async function createSession({ id, accountId, audience, tokenHash, createdAt, expiresAt }) {
    await pool.query(
      `INSERT INTO auth_sessions (id, account_id, audience, token_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, accountId, audience, tokenHash, createdAt, expiresAt]
    );
  }

  async function findSessionByTokenHash(tokenHash, now) {
    const result = await pool.query(
      `SELECT s.id, s.account_id, s.audience, s.expires_at, s.revoked_at, a.status
       FROM auth_sessions s
       JOIN platform_accounts a ON a.id = s.account_id
       WHERE s.token_hash = $1`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row) return null;
    if (row.revoked_at || new Date(row.expires_at) <= now) return null;
    return row;
  }

  async function revokeSession(id, now) {
    await pool.query(
      `UPDATE auth_sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL`,
      [id, now]
    );
  }

  async function revokeActiveSessions(accountId, audience, now) {
    await pool.query(
      `UPDATE auth_sessions
       SET revoked_at = $3
       WHERE account_id = $1 AND audience = $2 AND revoked_at IS NULL`,
      [accountId, audience, now]
    );
  }

  async function findWechatIdentity(appId, openid) {
    const result = await pool.query(
      `SELECT id, account_id, app_id, openid, unionid
       FROM wechat_identities
       WHERE app_id = $1 AND openid = $2`,
      [appId, openid]
    );
    return result.rows[0] ?? null;
  }

  async function createWechatAccount({ accountId, identityId, appId, openid, unionid, now }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO platform_accounts (id, status, created_at, updated_at)
         VALUES ($1, 'active', $2, $2)`,
        [accountId, now]
      );
      await client.query(
        `INSERT INTO wechat_identities
           (id, account_id, app_id, openid, unionid, first_bound_at, last_login_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [identityId, accountId, appId, openid, unionid, now]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function touchWechatLogin(identityId, now, unionid) {
    await pool.query(
      `UPDATE wechat_identities
       SET last_login_at = $2, unionid = COALESCE($3, unionid)
       WHERE id = $1`,
      [identityId, now, unionid]
    );
  }

  async function getAccountProjection(accountId) {
    const account = await pool.query(
      `SELECT id, status FROM platform_accounts WHERE id = $1`,
      [accountId]
    );
    if (!account.rows[0]) return null;

    const [operators, domainOperators, memberships, credentials] = await Promise.all([
      pool.query(
        `SELECT source FROM platform_operator_grants WHERE account_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT domain_id FROM domain_operator_grants WHERE account_id = $1`,
        [accountId]
      ),
      pool.query(
        `SELECT domain_id FROM domain_memberships WHERE account_id = $1 AND status = 'active'`,
        [accountId]
      ),
      pool.query(
        `SELECT login_name FROM admin_credentials WHERE account_id = $1`,
        [accountId]
      )
    ]);

    return {
      id: account.rows[0].id,
      status: account.rows[0].status,
      platformOperator: operators.rowCount > 0,
      domainOperatorDomainIds: domainOperators.rows.map((row) => row.domain_id),
      memberDomainIds: memberships.rows.map((row) => row.domain_id),
      loginName: credentials.rows[0]?.login_name ?? null
    };
  }

  return {
    countPlatformOperators,
    createPlatformOperator,
    findAdminCredentialByLoginName,
    createSession,
    findSessionByTokenHash,
    revokeSession,
    revokeActiveSessions,
    findWechatIdentity,
    createWechatAccount,
    touchWechatLogin,
    getAccountProjection
  };
}
