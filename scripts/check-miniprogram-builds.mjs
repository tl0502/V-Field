import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

function configString(source, name) {
  const match = source.match(new RegExp(`export const ${name}\\s*=\\s*(['"])([^'"]+)\\1`));
  assert.ok(match, `Missing public routing configuration: ${name}`);
  return match[2];
}

async function readArtifact(workspace) {
  const directory = resolve(root, workspace, 'dist/build/mp-weixin');
  const files = new Map();
  async function visit(relative = '') {
    for (const entry of await readdir(resolve(directory, relative), { withFileTypes: true })) {
      const name = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await visit(name);
      else if (/\.(js|json|wxml|wxss|wxs|map)$/.test(name) && entry.name !== 'project.private.config.json') {
        files.set(name, await readFile(resolve(directory, name), 'utf8'));
      }
    }
  }
  try { await visit(); }
  catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Missing ${workspace} build; run npm run build first.`);
    throw error;
  }
  assert.ok(files.has('app.js') && files.has('app.json'), `Incomplete mini program build: ${workspace}`);
  return {
    text: [...files.values()].join('\n'),
    app: JSON.parse(files.get('app.json')),
    project: JSON.parse(files.get('project.config.json')),
    templates: [...files].filter(([name]) => /\.(wxml|wxss)$/.test(name)).sort(([a], [b]) => a.localeCompare(b))
  };
}

export async function checkMiniprogramBuilds({ testOnly = false } = {}) {
  const [productionSource, testSource, testBuild] = await Promise.all([
    readFile(resolve(root, 'apps/miniprogram/src/utils/config.ts'), 'utf8'),
    readFile(resolve(root, 'apps/testminiprogram/src/config.ts'), 'utf8'),
    readArtifact('apps/testminiprogram')
  ]);
  const productionMarkers = [configString(productionSource, 'cloudRunEnv'), configString(productionSource, 'sessionStorageKey'), 'X-WX-SERVICE'];
  const testMarkers = [configString(testSource, 'testApiBaseUrl'), configString(testSource, 'sessionStorageKey')];
  for (const marker of testMarkers) assert.ok(testBuild.text.includes(marker), `Test build is missing ${marker}`);
  for (const marker of productionMarkers) assert.ok(!testBuild.text.includes(marker), `CloudRun configuration leaked into test build: ${marker}`);
  assert.equal(testBuild.project.miniprogramRoot, './', 'Test dist must open directly in WeChat DevTools');
  if (testOnly) return;

  const productionBuild = await readArtifact('apps/miniprogram');
  for (const marker of productionMarkers) assert.ok(productionBuild.text.includes(marker), `Production build is missing ${marker}`);
  for (const marker of testMarkers) assert.ok(!productionBuild.text.includes(marker), `Test configuration leaked into production build: ${marker}`);
  assert.ok(productionBuild.text.includes('.cloud.callContainer('), 'Production requests must use CloudRun');
  assert.equal(testBuild.project.appid, productionBuild.project.appid, 'Both builds must use the same WeChat AppID');
  assert.deepEqual(testBuild.app, productionBuild.app, 'Both builds must share page routes, navigation and theme');
  assert.deepEqual(testBuild.templates, productionBuild.templates, 'Both builds must share page/component templates and styles');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await checkMiniprogramBuilds();
  console.log('Mini program build isolation passed: separate routes/sessions and shared pages/styles.');
}
