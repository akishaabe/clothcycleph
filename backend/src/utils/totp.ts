import crypto from 'crypto';
import { config } from '../config/env.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const DEFAULT_PERIOD_SECONDS = 30;
const DEFAULT_DIGITS = 6;

export function generateTotpSecret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let bits = '';
  let secret = '';

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }

  for (let index = 0; index < bits.length; index += 5) {
    const chunk = bits.slice(index, index + 5).padEnd(5, '0');
    secret += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return secret;
}

export function buildOtpAuthUrl(email: string, secret: string) {
  const issuer = 'ClothCycle PH';
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DEFAULT_DIGITS),
    period: String(DEFAULT_PERIOD_SECONDS),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}

export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  const normalizedCode = code.replace(/\s/g, '');

  if (!/^\d{6}$/.test(normalizedCode)) {
    return false;
  }

  const counter = Math.floor(Date.now() / 1000 / DEFAULT_PERIOD_SECONDS);

  for (let offset = -window; offset <= window; offset++) {
    const expected = generateTotpCode(secret, counter + offset);
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalizedCode))) {
      return true;
    }
  }

  return false;
}

export function encryptSecret(secret: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(encryptedSecret: string): string {
  const key = getEncryptionKey();
  const [ivPart, tagPart, ciphertextPart] = encryptedSecret.split('.');

  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error('Invalid encrypted secret');
  }

  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivPart, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function generateTotpCode(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return String(binary % 10 ** DEFAULT_DIGITS).padStart(DEFAULT_DIGITS, '0');
}

function decodeBase32(value: string): Buffer {
  const cleanValue = value.replace(/=+$/g, '').replace(/\s/g, '').toUpperCase();
  let bits = '';

  for (const character of cleanValue) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error('Invalid base32 secret');
    }

    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

function getEncryptionKey(): Buffer {
  const configuredKey = config.security.twoFactorEncryptionKey || config.jwt.secret;

  if (!configuredKey) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY or JWT_SECRET is required');
  }

  return crypto.createHash('sha256').update(configuredKey).digest();
}
