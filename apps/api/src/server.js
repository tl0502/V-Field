import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AuthError, createAuthService } from './auth.js';
import {
  getDatabaseUrl,
  getHost,
  getPort,
  getSessionTtlMs,
  getWechatAppId,
  getWechatAppSecret,
  trustsCloudRunIdentity
} from './config.js';
import { createDatabasePool } from './db.js';
import { runMigrations } from './migrate.js';
import { createIdentityRepository } from './repository.js';
import { createWechatClient } from './wechat-client.js';
import { createCommunityRepository } from './community-repository.js';
import { createCommunityRoutes } from './community-routes.js';
import { CommunityError } from './community-errors.js';
import { ContentValidationError } from '../../../packages/content-core/src/index.js';

const maximumBodyBytes = 64 * 1024;
const adminCookieNames = {
  'admin-platform': 'vquan_admin_platform',
  'admin-domain': 'vquan_admin_domain'
};

function applyApiHeaders(res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'access-control-allow-headers',
    'content-type, authorization, x-vquan-audience, x-vquan-session'
  );
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

function adminCookieName(audience) {
  return adminCookieNames[audience] ?? '';
}

function sessionCookieHeader(audience, token, maxAgeSeconds) {
  const name = adminCookieName(audience);
  if (!name) return '';
  const parts = [`${name}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (Number.isInteger(maxAgeSeconds) && maxAgeSeconds > 0) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }
  return parts.join('; ');
}

function applySessionCookie(res, audience, token, maxAgeSeconds) {
  const header = sessionCookieHeader(audience, token, maxAgeSeconds);
  if (!header) return;
  const existing = res.getHeader('set-cookie');
  res.setHeader('set-cookie', existing ? [].concat(existing, header) : header);
}

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readJsonBody(req, maximumBytes = maximumBodyBytes) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size <= maximumBytes) chunks.push(chunk);
  }

  if (size > maximumBytes) {
    const error = new Error('request_body_too_large');
    error.code = 'request_body_too_large';
    throw error;
  }

  if (chunks.length === 0) {
    return {};
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('invalid_json');
    error.code = 'invalid_json';
    throw error;
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    const error = new Error('invalid_body');
    error.code = 'invalid_body';
    throw error;
  }
  return body;
}

function firstHeader(req, name) {
  const header = Array.prototype.concat(req.headers[name] ?? [])[0];
  return typeof header === 'string' ? header.trim() : '';
}

function sessionToken(req, audience) {
  const authorization = firstHeader(req, 'authorization');
  const match = authorization ? authorization.match(/^Bearer\s+([^\s]+)$/i) : null;
  if (match) return match[1];
  const headerToken = firstHeader(req, 'x-vquan-session');
  if (headerToken) return headerToken;
  const name = adminCookieName(audience);
  if (!name) return '';
  return parseCookies(firstHeader(req, 'cookie'))[name] ?? '';
}

function requestAudience(req, url) {
  const header = firstHeader(req, 'x-vquan-audience');
  if (header) return header;
  return (url.searchParams.get('audience') ?? '').trim();
}

function cloudRunWechatIdentity(req) {
  return {
    openid: firstHeader(req, 'x-wx-openid') || firstHeader(req, 'x-wx-from-openid'),
    unionid: firstHeader(req, 'x-wx-unionid') || firstHeader(req, 'x-wx-from-unionid'),
    headerAppId: firstHeader(req, 'x-wx-appid') || firstHeader(req, 'x-wx-from-appid')
  };
}

export function createApp({ auth, community, trustCloudRunIdentity = false }) {
  const communityRoute = createCommunityRoutes({ auth, community, readBody: readJsonBody, sessionToken, json });
  return createServer(async (req, res) => {
    applyApiHeaders(res);

    try {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      const pathname = url.pathname;

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (
        (req.method === 'GET' || req.method === 'HEAD') &&
        (pathname === '/' || pathname === '/health' || pathname === '/api/health')
      ) {
        json(res, 200, { ok: true, service: 'vquan-next-api' });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/meta') {
        json(res, 200, {
          stage: community ? 'p3-first-user-loop' : 'p2-runtime-foundation',
          delivered: ['skeleton', 'empty-database', 'min-identity', ...(community ? ['public-user-id', 'user-lookup', 'assign-domain-operator', 'join-approval', 'domain-types', 'domain-tags', 'publish', 'read', 'author-delete'] : [])],
          notDelivered: community ? ['profile-edit', 'media-upload', 'comments', 'messages', 'follow', 'content-search'] : ['assign-domain-operator', 'join-approval', 'publish', 'read']
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/admin/login') {
        const body = await readJsonBody(req);
        const audience = requestAudience(req, url);
        const result = await auth.adminLogin({
          loginName: body.loginName,
          password: body.password,
          audience,
          currentToken: sessionToken(req, audience === 'admin-domain' ? 'admin-domain' : 'admin-platform')
        });
        applySessionCookie(
          res,
          result.audience,
          result.token,
          Math.floor(getSessionTtlMs() / 1000)
        );
        json(res, 200, result);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/wechat/login') {
        const body = await readJsonBody(req);
        json(res, 200, await auth.wechatLogin({
          code: body.code,
          ...(trustCloudRunIdentity ? cloudRunWechatIdentity(req) : {})
        }));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/auth/me') {
        const audience = requestAudience(req, url);
        const { body } = await auth.readSession(sessionToken(req, audience), audience);
        json(res, 200, body);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        const audience = requestAudience(req, url);
        json(res, 200, await auth.logout(sessionToken(req, audience), audience));
        return;
      }

      if (await communityRoute(req, res, url)) return;
      json(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof AuthError) {
        json(res, error.statusCode, { error: error.code });
        return;
      }
      if (error instanceof CommunityError || error instanceof ContentValidationError) {
        json(res, error.statusCode ?? 400, { error: error.code, ...(error.issues?.length ? { issues: error.issues } : {}) });
        return;
      }
      if (error.code === 'user_id_allocation_unavailable') {
        json(res, 503, { error: error.code });
        return;
      }
      if (error.code === 'invalid_json' || error.code === 'invalid_body') {
        json(res, 400, { error: error.code });
        return;
      }
      if (error.code === 'request_body_too_large') {
        json(res, 413, { error: 'request_body_too_large' });
        return;
      }
      console.error(error);
      json(res, 500, { error: 'internal_error' });
    }
  });
}

export async function startServer(port = getPort(), host = getHost()) {
  const pool = await createDatabasePool(getDatabaseUrl());
  await runMigrations(pool);

  const auth = createAuthService({
    repository: createIdentityRepository(pool),
    wechatClient: createWechatClient({
      appId: getWechatAppId(),
      appSecret: getWechatAppSecret()
    }),
    appId: getWechatAppId(),
    sessionTtlMs: getSessionTtlMs()
  });

  const server = createApp({ auth, community: createCommunityRepository(pool), trustCloudRunIdentity: trustsCloudRunIdentity() });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(port, host, () => {
      server.off('error', rejectListen);
      resolveListen();
    });
  });

  server.once('close', () => {
    pool.end().catch(() => {});
  });

  return { server, pool };
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer()
    .then(({ server }) => {
      const address = server.address();
      console.log(`API listening on http://${address.address}:${address.port}`);
    })
    .catch((error) => {
      console.error('API failed to start', error);
      process.exitCode = 1;
    });
}
