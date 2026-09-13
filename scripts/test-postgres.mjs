import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createDatabasePool } from '../apps/api/src/db.js';
import { runMigrations } from '../apps/api/src/migrate.js';

const exec = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
let containerId;
try {
  const password = randomBytes(24).toString('hex');
  const started = await exec('docker', [
    'run', '--detach', '--rm', '--label', 'vquan.test=review-regression',
    '--publish', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data',
    '-e', 'POSTGRES_DB=vquan_test_review', '-e', 'POSTGRES_USER=review',
    '-e', `POSTGRES_PASSWORD=${password}`, 'postgres:17-alpine'
  ], { timeout: 180_000 });
  containerId = started.stdout.trim();
  if (!/^[a-f0-9]{64}$/.test(containerId)) throw new Error('Invalid temporary container ID');
  const { stdout } = await exec('docker', ['port', containerId, '5432/tcp']);
  const port = stdout.trim().match(/^127\.0\.0\.1:(\d+)$/)?.[1];
  if (!port) throw new Error('Temporary PostgreSQL was not bound exclusively to loopback');
  const databaseUrl = `postgres://review:${password}@127.0.0.1:${port}/vquan_test_review?sslmode=disable`;
  const pool = await createDatabasePool(databaseUrl);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try { await pool.query('SELECT 1'); ready = true; break; }
      catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
    }
    if (!ready) throw new Error('Temporary PostgreSQL did not become ready');
    await runMigrations(pool);
  } finally {
    await pool.end();
  }
  const tests = (await readdir(new URL('../apps/api/test/', import.meta.url)))
    .filter((name) => name.endsWith('.test.js')).map((name) => `apps/api/test/${name}`);
  const result = await exec(process.execPath, ['--test', '--test-reporter=spec', ...tests], {
    cwd: root, timeout: 120_000, maxBuffer: 4 * 1024 * 1024,
    env: { ...process.env, DATABASE_URL: '', TEST_DATABASE_URL: databaseUrl }
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
} catch (error) {
  if (error.stdout) process.stdout.write(error.stdout);
  // Do not print child-process command arguments, which contain temporary credentials.
  console.error(error.stderr || 'Isolated PostgreSQL checks failed');
  process.exitCode = 1;
} finally {
  if (containerId && /^[a-f0-9]{64}$/.test(containerId)) {
    await exec('docker', ['stop', '--time', '1', containerId]).catch(() => {
      console.error(`Unable to stop temporary test container ${containerId}`);
      process.exitCode = 1;
    });
  }
}
