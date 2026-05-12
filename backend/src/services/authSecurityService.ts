import crypto from 'crypto';
import { query } from '../config/database.js';
import { hashPassword, comparePassword } from '../utils/auth.js';

type AuthEventInput = {
  userId?: string | null;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
};

export async function recordAuthEvent({
  userId = null,
  eventType,
  ipAddress,
  userAgent,
  metadata,
}: AuthEventInput) {
  await query(
    `INSERT INTO auth_events (user_id, event_type, ip_address, user_agent, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, eventType, ipAddress, userAgent, metadata ? JSON.stringify(metadata) : null]
  );
}

export async function checkRateLimit(key: string, maxAttempts: number, windowSeconds: number) {
  const result = await query(
    `INSERT INTO rate_limits (key, count, expires_at)
     VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 second'))
     ON CONFLICT (key)
     DO UPDATE SET
       count = CASE
         WHEN rate_limits.expires_at <= NOW() THEN 1
         ELSE rate_limits.count + 1
       END,
       expires_at = CASE
         WHEN rate_limits.expires_at <= NOW() THEN NOW() + ($2 * INTERVAL '1 second')
         ELSE rate_limits.expires_at
       END,
       updated_at = NOW()
     RETURNING count, expires_at`,
    [key, windowSeconds]
  );

  const row = result.rows[0];
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000)
  );

  return {
    allowed: row.count <= maxAttempts,
    count: row.count as number,
    retryAfterSeconds,
  };
}

export async function clearRateLimit(key: string) {
  await query('DELETE FROM rate_limits WHERE key = $1', [key]);
}

export function buildRateLimitKey(prefix: string, identifier: string | undefined) {
  return `${prefix}:${identifier || 'unknown'}`.slice(0, 255);
}

export async function replaceRecoveryCodes(userId: string, count = 10) {
  const plainCodes = Array.from({ length: count }, generateRecoveryCode);
  const hashedCodes = await Promise.all(plainCodes.map((code) => hashPassword(code)));

  await query('DELETE FROM user_recovery_codes WHERE user_id = $1', [userId]);

  for (const codeHash of hashedCodes) {
    await query('INSERT INTO user_recovery_codes (user_id, code_hash) VALUES ($1, $2)', [
      userId,
      codeHash,
    ]);
  }

  return plainCodes;
}

export async function useRecoveryCode(userId: string, code: string) {
  const result = await query(
    `SELECT id, code_hash
     FROM user_recovery_codes
     WHERE user_id = $1 AND used_at IS NULL
     ORDER BY created_at ASC`,
    [userId]
  );

  for (const recoveryCode of result.rows) {
    const isMatch = await comparePassword(normalizeRecoveryCode(code), recoveryCode.code_hash);
    if (isMatch) {
      await query('UPDATE user_recovery_codes SET used_at = NOW() WHERE id = $1', [
        recoveryCode.id,
      ]);
      return true;
    }
  }

  return false;
}

function generateRecoveryCode() {
  return `${crypto.randomBytes(4).toString('hex')}-${crypto.randomBytes(4).toString('hex')}`;
}

function normalizeRecoveryCode(code: string) {
  return code.trim().toLowerCase();
}
