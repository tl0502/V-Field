import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const scryptKeyLength = 64;

export function newId() {
  return randomUUID();
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password, salt, scryptKeyLength);
  return `scrypt:${salt.toString('base64url')}:${Buffer.from(derived).toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored).split(':');

  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = Buffer.from(parts[1], 'base64url');
  const expected = Buffer.from(parts[2], 'base64url');

  if (!salt.length || expected.length !== scryptKeyLength) {
    return false;
  }

  const actual = await scryptAsync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}
