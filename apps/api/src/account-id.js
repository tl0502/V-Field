import { randomInt } from 'node:crypto';

export function newPublicUserId() {
  return String(randomInt(10_000_000, 100_000_000));
}

export async function insertAccount(client, accountId, now, generateUserId = newPublicUserId) {
  for (let attempt = 0; attempt < 32; attempt++) {
    const result = await client.query(
      `INSERT INTO platform_accounts (id, user_id, status, created_at, updated_at)
       VALUES ($1, $2, 'active', $3, $3)
       ON CONFLICT (user_id) DO NOTHING RETURNING user_id`,
      [accountId, generateUserId(), now]
    );
    if (result.rowCount) return result.rows[0].user_id;
  }
  const error = new Error('user_id_allocation_unavailable');
  error.code = 'user_id_allocation_unavailable';
  throw error;
}
