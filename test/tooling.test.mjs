import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

async function viteFor(workspace) {
  const require = createRequire(resolve(root, workspace, 'package.json'));
  const packagePath = require.resolve('vite/package.json');
  return import(pathToFileURL(resolve(dirname(packagePath), 'dist/node/index.js')).href);
}

for (const workspace of ['apps/admin-platform', 'apps/admin-domain']) {
  test(`${workspace}: dev server rejects cross-origin reading and API workspace access`, async () => {
    const vite = await viteFor(workspace);
    assert.equal(vite.version, '6.4.3');
    const server = await vite.createServer({
      root: resolve(root, workspace), configFile: resolve(root, workspace, 'vite.config.ts'),
      logLevel: 'silent', optimizeDeps: { noDiscovery: true, include: [] },
      server: { host: '127.0.0.1', port: 0, strictPort: false, open: false, preTransformRequests: false }
    });
    try {
      await server.listen();
      const base = `http://127.0.0.1:${server.httpServer.address().port}`;
      const page = await fetch(base, { headers: { origin: 'https://review.invalid' } });
      assert.equal(page.status, 200);
      assert.equal(page.headers.get('access-control-allow-origin'), null);
      await page.text();
      const outside = resolve(root, 'apps/api/package.json').replaceAll('\\', '/');
      const forbidden = await fetch(`${base}/@fs/${outside}`);
      assert.equal(forbidden.status, 403);
      await forbidden.text();
      const source = await fetch(`${base}/src/main.ts`);
      assert.equal(source.status, 200);
      await source.text();
      const shared = resolve(root, 'packages/admin-shell/src/index.ts').replaceAll('\\', '/');
      const sharedResponse = await fetch(`${base}/@fs/${shared}`);
      assert.equal(sharedResponse.status, 200);
      await sharedResponse.text();
    } finally {
      server.httpServer.closeAllConnections();
      await server.close();
    }
  });
}

test('miniprogram rejects HTTP server and non-WeChat build entrypoints', async () => {
  const vite = await viteFor('apps/miniprogram');
  const previousPlatform = process.env.UNI_PLATFORM;
  try {
    for (const [command, platform] of [['serve', 'mp-weixin'], ['serve', 'h5'], ['build', 'h5']]) {
      process.env.UNI_PLATFORM = platform;
      await assert.rejects(vite.loadConfigFromFile(
        { command, mode: 'development' }, resolve(root, 'apps/miniprogram/vite.config.ts'),
        resolve(root, 'apps/miniprogram'), 'silent'
      ), /仅支持微信小程序构建/);
    }
  } finally {
    if (previousPlatform === undefined) delete process.env.UNI_PLATFORM;
    else process.env.UNI_PLATFORM = previousPlatform;
  }
});

test('test miniprogram cannot build through the production entrypoint or overwrite another output directory', async () => {
  const vite = await viteFor('apps/miniprogram');
  const keys = ['UNI_PLATFORM', 'VQUAN_BUILD_TARGET', 'UNI_OUTPUT_DIR'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const testOutput = resolve(root, 'apps/testminiprogram/dist/build/mp-weixin');
  const invalidEntries = [
    { mode: 'testminiprogram', target: undefined, output: testOutput },
    { mode: 'testminiprogram', target: 'testminiprogram', output: undefined },
    { mode: 'testminiprogram', target: 'testminiprogram', output: resolve(root, 'apps/miniprogram/dist/build/mp-weixin') },
    { mode: 'testminiprogram', target: 'testminiprogram', output: resolve(root, 'apps/testminiprogram-other/dist/build/mp-weixin') },
    { mode: 'production', target: 'testminiprogram', output: testOutput }
  ];
  if (process.platform === 'win32') {
    const otherDrive = root.toLowerCase().startsWith('c:') ? 'D:' : 'C:';
    invalidEntries.push({ mode: 'testminiprogram', target: 'testminiprogram', output: `${otherDrive}\\outside\\mp-weixin` });
  }
  try {
    process.env.UNI_PLATFORM = 'mp-weixin';
    for (const { mode, target, output } of invalidEntries) {
      if (target === undefined) delete process.env.VQUAN_BUILD_TARGET;
      else process.env.VQUAN_BUILD_TARGET = target;
      if (output === undefined) delete process.env.UNI_OUTPUT_DIR;
      else process.env.UNI_OUTPUT_DIR = output;
      await assert.rejects(vite.loadConfigFromFile(
        { command: 'build', mode }, resolve(root, 'apps/miniprogram/vite.config.ts'),
        resolve(root, 'apps/miniprogram'), 'silent'
      ), /测试包必须通过 build:testminiprogram/);
    }
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
