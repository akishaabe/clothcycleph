import { randomBytes, sha256, hmacSha1, encodeBase64Url, decodeBase64Url, textToUint8Array, uint8ArrayToText } from './workerCrypto.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateNumericCode(length = 6): string {
  const digits = [];
  for (let i = 0; i < length; i += 1) {
    digits.push(Math.floor(crypto.getRandomValues(new Uint8Array(1))[0] / 256 * 10));
  }
  return digits.join('');
}

export function generateSecureToken(length = 32): string {
  const bytes = randomBytes(length);
  return encodeBase64Url(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const digest = await sha256(token);
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < bytes.length; i += 1) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i += 1) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) {
      continue;
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return new Uint8Array(output);
}

export function generateTotpSecret(length = 20): string {
  const secret = randomBytes(length);
  return base32Encode(secret);
}

export function buildOtpAuthUrl(email: string, issuer: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const issuerParam = encodeURIComponent(issuer);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuerParam}&digits=6&period=30&algorithm=SHA1`;
}

function intToBytes(value: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i -= 1) {
    bytes[i] = value & 0xff;
    value >>= 8;
  }
  return bytes;
}

export async function verifyTotpCode(secret: string, code: string, window = 1): Promise<boolean> {
  const normalizedSecret = secret.replace(/\s+/g, '').toUpperCase();
  const key = base32Decode(normalizedSecret);
  const timeSlice = Math.floor(Date.now() / 1000 / 30);

  for (let offset = -window; offset <= window; offset += 1) {
    const otp = await generateTotpCode(key, timeSlice + offset);
    if (otp === code) {
      return true;
    }
  }

  return false;
}

async function generateTotpCode(key: Uint8Array, counter: number): Promise<string> {
  const counterBytes = intToBytes(counter);
  const hmac = await hmacSha1(key, counterBytes);
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const otp = (binary % 10 ** 6).toString().padStart(6, '0');
  return otp;
}

export async function encryptSecret(secret: string, keySecret: string): Promise<string> {
  const keyHash = await sha256(keySecret);
  return aesGcmEncrypt(keyHash, secret);
}

export async function decryptSecret(encryptedSecret: string, keySecret: string): Promise<string> {
  const keyHash = await sha256(keySecret);
  return aesGcmDecrypt(keyHash, encryptedSecret);
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    textToUint8Array(plaintext)
  );
  const cipherBytes = new Uint8Array(ciphertext);
  const tag = cipherBytes.slice(cipherBytes.length - 16);
  const data = cipherBytes.slice(0, cipherBytes.length - 16);
  return `${encodeBase64Url(iv)}.${encodeBase64Url(tag)}.${encodeBase64Url(data)}`;
}

async function aesGcmDecrypt(key: Uint8Array, encrypted: string): Promise<string> {
  const [ivPart, tagPart, ciphertextPart] = encrypted.split('.');
  if (!ivPart || !tagPart || !ciphertextPart) {
    throw new Error('Invalid encrypted payload');
  }
  const iv = decodeBase64Url(ivPart);
  const tag = decodeBase64Url(tagPart);
  const data = decodeBase64Url(ciphertextPart);
  const combined = new Uint8Array(data.length + tag.length);
  combined.set(data);
  combined.set(tag, data.length);
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    combined
  );
  return uint8ArrayToText(new Uint8Array(decrypted));
}
