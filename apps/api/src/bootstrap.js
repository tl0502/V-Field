import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthError, createAuthService } from './auth.js';
import {
  getBootstrapLoginName,
  getBootstrapPassword,
  getDatabaseUrl,
  getSessionTtlMs,
  getWechatAppId
} from './config.js';
import { createDatabasePool } from './db.js';
import { createIdentityRepository } from './repository.js';

export async function bootstrapFromEnv({ repository, sessionTtlMs, appId }) {
  const loginName = getBootstrapLoginName();
  const password = getBootstrapPassword();

  if (!loginName || !password) {
    throw new Error('缺少 PLATFORM_BOOTSTRAP_LOGIN 或 PLATFORM_BOOTSTRAP_PASSWORD');
  }

  const auth = createAuthService({
    repository,
    wechatClient: { async code2Session() { throw new Error('unused'); } },
    appId,
    sessionTtlMs
  });

  return auth.bootstrapPlatformOperator({ loginName, password });
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const pool = createDatabasePool(getDatabaseUrl());
  const repository = createIdentityRepository(pool);

  bootstrapFromEnv({
    repository,
    sessionTtlMs: getSessionTtlMs(),
    appId: getWechatAppId()
  })
    .then((result) => {
      console.log(`Bootstrapped platform operator loginName=${result.loginName} accountId=${result.accountId}`);
    })
    .catch((error) => {
      if (error instanceof AuthError && error.code === 'platform_operator_exists') {
        console.log('Platform operator already exists; bootstrap refused to overwrite');
        process.exitCode = 0;
        return;
      }
      console.error('Bootstrap failed', error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
