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
  getWechatAppSecret
} from './config.js';
import { createDatabasePool } from './db.js';
import { runMigrations } from './migrate.js';
import { createIdentityRepository } from './repository.js';
import { createWechatClient } from './wechat-client.js';

const maximumBodyBytes = 64 * 1024;

function applyApiHeaders(res) {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-methods', 'GET, POST, OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type, authorization, x-vquan-audience');
}

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maximumBodyBytes) {
      const error = new Error('request_body_too_large');
      error.code = 'request_body_too_large';
      throw error;
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('invalid_json');
    error.code = 'invalid_json';
    throw error;
  }
}

function bearerToken(req) {
  const header = Array.prototype.concat(req.headers.authorization ?? [])[0];
  const match = typeof header === 'string' ? header.match(/^Bearer\s+([^\s]+)$/i) : null;
  return match ? match[1] : '';
}

function requestAudience(req) {
  const header = Array.prototype.concat(req.headers['x-vquan-audience'] ?? [])[0];
  return typeof header === 'string' ? header.trim() : '';
}

export function createApp({ auth }) {
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

      if (req.method === 'GET' && pathname === '/api/health') {
        json(res, 200, { ok: true, service: 'vquan-next-api' });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/meta') {
        json(res, 200, {
          stage: 'p2-runtime-foundation',
          delivered: ['skeleton', 'empty-database', 'min-identity'],
          notDelivered: ['assign-domain-operator', 'join-approval', 'publish', 'read']
        });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/admin/login') {
        const body = await readJsonBody(req);
        json(res, 200, await auth.adminLogin({
          loginName: body.loginName,
          password: body.password
        }));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/wechat/login') {
        const body = await readJsonBody(req);
        json(res, 200, await auth.wechatLogin({ code: body.code }));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/auth/me') {
        const { body } = await auth.readSession(bearerToken(req), requestAudience(req));
        json(res, 200, body);
        return;
      }

      if (req.method === 'POST' && pathname === '/api/auth/logout') {
        json(res, 200, await auth.logout(bearerToken(req), requestAudience(req)));
        return;
      }

      json(res, 404, { error: 'not_found' });
    } catch (error) {
      if (error instanceof AuthError) {
        json(res, error.statusCode, { error: error.code });
        return;
      }
      if (error.code === 'invalid_json') {
        json(res, 400, { error: 'invalid_json' });
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

  const server = createApp({ auth });

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
