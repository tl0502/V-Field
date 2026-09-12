import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  newId,
  verifyPassword
} from './crypto.js';
import { WechatApiError } from './wechat-client.js';

const loginNamePattern = /^[a-zA-Z][a-zA-Z0-9_-]{2,63}$/;

export class AuthError extends Error {
  constructor(code, statusCode = 400) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

function presentAccount(account, audience) {
  return {
    account: {
      id: account.id,
      status: account.status
    },
    roles: {
      platformOperator: Boolean(account.platformOperator),
      domainOperatorDomainIds: account.domainOperatorDomainIds,
      memberDomainIds: account.memberDomainIds
    },
    audience,
    loginName: account.loginName,
    notDelivered: ['assign-domain-operator', 'join-approval', 'publish', 'read']
  };
}

export function createAuthService({
  repository,
  wechatClient,
  appId,
  now = () => new Date(),
  sessionTtlMs
}) {
  async function issueSession(accountId, audience) {
    const createdAt = now();
    const token = createSessionToken();
    await repository.revokeActiveSessions(accountId, audience, createdAt);
    await repository.createSession({
      id: newId(),
      accountId,
      audience,
      tokenHash: hashSessionToken(token),
      createdAt,
      expiresAt: new Date(createdAt.getTime() + sessionTtlMs)
    });
    return token;
  }

  async function bootstrapPlatformOperator({ loginName, password }) {
    if (!loginNamePattern.test(loginName)) {
      throw new AuthError('bootstrap_login_invalid');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new AuthError('bootstrap_password_invalid');
    }

    const existing = await repository.countPlatformOperators();
    if (existing > 0) {
      throw new AuthError('platform_operator_exists', 409);
    }

    const accountId = newId();
    await repository.createPlatformOperator({
      accountId,
      loginName,
      passwordHash: await hashPassword(password),
      now: now(),
      source: 'bootstrap'
    });

    return { accountId, loginName };
  }

  async function adminLogin({ loginName, password }) {
    if (typeof loginName !== 'string' || typeof password !== 'string') {
      throw new AuthError('invalid_credentials', 401);
    }

    const credential = await repository.findAdminCredentialByLoginName(loginName.trim());
    if (!credential || credential.status !== 'active') {
      throw new AuthError('invalid_credentials', 401);
    }

    const matches = await verifyPassword(password, credential.password_hash);
    if (!matches) {
      throw new AuthError('invalid_credentials', 401);
    }

    const token = await issueSession(credential.account_id, 'admin');
    const account = await repository.getAccountProjection(credential.account_id);
    return { token, ...presentAccount(account, 'admin') };
  }

  async function wechatLogin({ code }) {
    if (typeof code !== 'string' || !code.trim()) {
      throw new AuthError('wechat_code_required');
    }
    if (!appId) {
      throw new AuthError('wechat_config_missing', 503);
    }

    let identity;
    try {
      identity = await wechatClient.code2Session(code.trim());
    } catch (error) {
      if (error instanceof WechatApiError && error.wechatCode === 'config_missing') {
        throw new AuthError('wechat_config_missing', 503);
      }
      throw new AuthError('wechat_login_failed', 502);
    }

    const current = now();
    let bound = await repository.findWechatIdentity(appId, identity.openid);
    if (!bound) {
      const accountId = newId();
      try {
        await repository.createWechatAccount({
          accountId,
          identityId: newId(),
          appId,
          openid: identity.openid,
          unionid: identity.unionid,
          now: current
        });
      } catch (error) {
        if (error.code !== '23505') {
          throw error;
        }
      }
      bound = await repository.findWechatIdentity(appId, identity.openid);
    } else {
      await repository.touchWechatLogin(bound.id, current, identity.unionid);
    }

    const account = await repository.getAccountProjection(bound.account_id);
    if (!account || account.status !== 'active') {
      throw new AuthError('account_disabled', 403);
    }

    const token = await issueSession(account.id, 'miniprogram');
    return { token, ...presentAccount(account, 'miniprogram') };
  }

  async function readSession(token, expectedAudience) {
    if (typeof token !== 'string' || !token) {
      throw new AuthError('unauthorized', 401);
    }

    const session = await repository.findSessionByTokenHash(hashSessionToken(token), now());
    if (!session || session.status !== 'active') {
      throw new AuthError('unauthorized', 401);
    }
    if (expectedAudience) {
      if (expectedAudience !== 'admin' && expectedAudience !== 'miniprogram') {
        throw new AuthError('unauthorized', 401);
      }
      if (session.audience !== expectedAudience) {
        throw new AuthError('unauthorized', 401);
      }
    }

    const account = await repository.getAccountProjection(session.account_id);
    if (!account || account.status !== 'active') {
      throw new AuthError('unauthorized', 401);
    }

    return { session, account, body: presentAccount(account, session.audience) };
  }

  async function logout(token, expectedAudience) {
    const { session } = await readSession(token, expectedAudience);
    await repository.revokeSession(session.id, now());
    return { ok: true };
  }

  return {
    bootstrapPlatformOperator,
    adminLogin,
    wechatLogin,
    readSession,
    logout
  };
}
