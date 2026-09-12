import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeDatabaseTarget, getDatabaseUrl, isDbResetAllowed } from './config.js';
import { createDatabasePool } from './db.js';
import { runMigrations } from './migrate.js';

export async function resetPublicSchema(pool) {
  const client = await pool.connect();

  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
    await client.query('GRANT ALL ON SCHEMA public TO public');
  } finally {
    client.release();
  }
}

const isMainModule =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  if (!isDbResetAllowed()) {
    console.error('拒绝执行清空：未设置 ALLOW_DB_RESET=1');
    process.exit(1);
  }

  const databaseUrl = getDatabaseUrl();
  const target = describeDatabaseTarget(databaseUrl);

  createDatabasePool(databaseUrl)
    .then(async (pool) => {
      try {
        await resetPublicSchema(pool);
        console.log(`Dropped and recreated public on ${target.host}:${target.port}/${target.database}`);
        const applied = await runMigrations(pool);
        console.log(applied.length ? `Migrations applied: ${applied.join(', ')}` : 'No new migrations');
      } finally {
        await pool.end();
      }
    })
    .catch((error) => {
      console.error('Database reset failed', error);
      process.exitCode = 1;
    });
}
