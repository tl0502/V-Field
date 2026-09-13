export function createMemoryRepository() {
  const accounts = new Map();
  const operators = new Map();
  const credentials = new Map();
  const sessions = new Map();
  const wechatIdentities = new Map();
  const domainOperators = [];
  const memberships = [];

  function wechatKey(appId, openid) {
    return `${appId}:${openid}`;
  }

  return {
    async countPlatformOperators() {
      return operators.size;
    },

    async createPlatformOperator({ accountId, loginName, passwordHash, now, source = 'bootstrap' }) {
      if (operators.size > 0) return false;
      accounts.set(accountId, { id: accountId, status: 'active' });
      operators.set(accountId, { accountId, grantedAt: now, source });
      credentials.set(loginName, {
        account_id: accountId,
        login_name: loginName,
        password_hash: passwordHash,
        status: 'active'
      });
      return true;
    },

    async findAdminCredentialByLoginName(loginName) {
      return credentials.get(loginName) ?? null;
    },

    async rotateSession({ id, accountId, audience, tokenHash, createdAt, expiresAt }) {
      for (const session of sessions.values()) {
        if (session.account_id === accountId && session.audience === audience && !session.revoked_at) {
          session.revoked_at = createdAt;
        }
      }
      sessions.set(tokenHash, {
        id,
        account_id: accountId,
        audience,
        expires_at: expiresAt,
        revoked_at: null,
        status: 'active',
        createdAt
      });
    },

    async findSessionByTokenHash(tokenHash, now) {
      const session = sessions.get(tokenHash);
      if (!session || session.revoked_at || session.expires_at <= now) return null;
      const account = accounts.get(session.account_id);
      return { ...session, status: account?.status ?? 'disabled' };
    },

    async revokeSession(id, now) {
      for (const session of sessions.values()) {
        if (session.id === id && !session.revoked_at) {
          session.revoked_at = now;
        }
      }
    },

    async findWechatIdentity(appId, openid) {
      return wechatIdentities.get(wechatKey(appId, openid)) ?? null;
    },

    async createWechatAccount({ accountId, identityId, appId, openid, unionid, now }) {
      accounts.set(accountId, { id: accountId, status: 'active' });
      wechatIdentities.set(wechatKey(appId, openid), {
        id: identityId,
        account_id: accountId,
        app_id: appId,
        openid,
        unionid
      });
      void now;
    },

    async touchWechatLogin(identityId, now, unionid) {
      for (const identity of wechatIdentities.values()) {
        if (identity.id === identityId) {
          identity.last_login_at = now;
          if (unionid) identity.unionid = unionid;
        }
      }
    },

    async getAccountProjection(accountId) {
      const account = accounts.get(accountId);
      if (!account) return null;
      const credential = [...credentials.values()].find((item) => item.account_id === accountId);
      return {
        id: account.id,
        status: account.status,
        platformOperator: operators.has(accountId),
        domainOperatorDomainIds: domainOperators
          .filter((item) => item.accountId === accountId)
          .map((item) => item.domainId),
        memberDomainIds: memberships
          .filter((item) => item.accountId === accountId && item.status === 'active')
          .map((item) => item.domainId),
        loginName: credential?.login_name ?? null
      };
    }
  };
}
