import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabaseUrl } from './config.js';
import { createDatabasePool } from './db.js';

const migrationsDirectory = fileURLToPath(new URL('../migrations/', import.meta.url));
const migrationLockId = 2_026_091_2;

export async function runMigrations(pool, directory = migrationsDirectory) {
  const files = (await readdir(directory))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const client = await pool.connect();
  const applied = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [migrationLockId]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const file of files) {
      const existing = await client.query(
        'SELECT 1 FROM schema_migrations WHERE name = $1',
        [file]
      );

      if (existing.rowCount > 0) {
        continue;
      }

      const sql = await readFile(resolve(directory, file), 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [migrationLockId]).catch(() => {});
    client.release();
  }

  return applied;
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  createDatabasePool(getDatabaseUrl())
    .then(async (pool) => {
      try {
        const applied = await runMigrations(pool);
        console.log(
          applied.length ? `PostgreSQL migrations applied: ${applied.join(', ')}` : 'PostgreSQL migrations already applied'
        );
      } finally {
        await pool.end();
      }
    })
    .catch((error) => {
      console.error('PostgreSQL migration failed', error);
      process.exitCode = 1;
    });
}
