import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMiniprogramBuilds } from './check-miniprogram-builds.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = resolve(root, 'apps/miniprogram');
const testRoot = resolve(root, 'apps/testminiprogram');
const outputRoot = resolve(testRoot, 'dist/build/mp-weixin');
if (relative(testRoot, outputRoot).startsWith('..') || !outputRoot.startsWith(testRoot)) throw new Error('Invalid test output directory');
const cli = resolve(root, 'node_modules/@dcloudio/vite-plugin-uni/bin/uni.js');
const child = spawn(process.execPath, [cli, 'build', '-p', 'mp-weixin', '--mode', 'testminiprogram'], {
  cwd: sourceRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_ROOT_DIR: sourceRoot,
    UNI_INPUT_DIR: resolve(sourceRoot, 'src'),
    UNI_OUTPUT_DIR: outputRoot,
    VQUAN_BUILD_TARGET: 'testminiprogram'
  }
});
const code = await new Promise((resolveExit, reject) => {
  child.once('error', reject);
  child.once('exit', (exitCode) => resolveExit(exitCode ?? 1));
});
if (code !== 0) process.exitCode = Number(code);
else {
  const generatedPath = resolve(outputRoot, 'project.config.json');
  const generated = JSON.parse(await readFile(generatedPath, 'utf8'));
  const source = JSON.parse(await readFile(resolve(testRoot, 'project.config.json'), 'utf8'));
  // This is part of the build, using the committed test project configuration.
  await writeFile(generatedPath, JSON.stringify({ ...generated, ...source, miniprogramRoot: './', setting: { ...generated.setting, ...source.setting } }, null, 2) + '\n');
  await checkMiniprogramBuilds({ testOnly: true });
  console.log('Test mini program built: apps/testminiprogram/dist/build/mp-weixin');
}
