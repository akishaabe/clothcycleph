const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const maxRange = 0xffffffff;
  const randomBuffer = randomBytes(4);
  const randomValue = (randomBuffer[0] << 24) | (randomBuffer[1] << 16) | (randomBuffer[2] << 8) | randomBuffer[3];
  return min + Math.floor((randomValue / maxRange) * range);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function escapeBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function encodeBase64Url(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return escapeBase64Url(base64);
}

export function decodeBase64Url(value: string): Uint8Array {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function sha256(text: string): Promise<Uint8Array> {
  const data = encoder.encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(digest);
}

export async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

export async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

export async function aesGcmEncrypt(key: Uint8Array, plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    encoder.encode(plaintext)
  );
  const cipherBytes = new Uint8Array(ciphertext);
  const tag = cipherBytes.slice(cipherBytes.length - 16);
  const data = cipherBytes.slice(0, cipherBytes.length - 16);
  return `${encodeBase64Url(iv)}.${encodeBase64Url(tag)}.${encodeBase64Url(data)}`;
}

export async function aesGcmDecrypt(key: Uint8Array, encrypted: string): Promise<string> {
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
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    cryptoKey,
    combined
  );
  return decoder.decode(plaintext);
}

export function textToUint8Array(text: string): Uint8Array {
  return encoder.encode(text);
}

export function uint8ArrayToText(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}
