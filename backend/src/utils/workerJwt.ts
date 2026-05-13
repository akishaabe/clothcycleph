import { encodeBase64Url, decodeBase64Url, hmacSha256, textToUint8Array, uint8ArrayToText } from './workerCrypto.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error('Invalid duration format');
  }
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      throw new Error('Invalid duration unit');
  }
}

function encodeJson(obj: Record<string, unknown>): string {
  return encodeBase64Url(encoder.encode(JSON.stringify(obj)));
}

function decodeJson<T>(value: string): T {
  const bytes = decodeBase64Url(value);
  return JSON.parse(decoder.decode(bytes));
}

export async function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresIn = '7d'
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payloadWithExp = {
    ...payload,
    iat: now,
    exp: now + parseDuration(expiresIn),
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payloadWithExp);
  const signature = await hmacSha256(
    textToUint8Array(secret),
    textToUint8Array(`${encodedHeader}.${encodedPayload}`)
  );
  return `${encodedHeader}.${encodedPayload}.${encodeBase64Url(signature)}`;
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  const [header, payload, signature] = parts;
  const expectedSignature = await hmacSha256(
    textToUint8Array(secret),
    textToUint8Array(`${header}.${payload}`)
  );
  const actualSignature = decodeBase64Url(signature);
  if (expectedSignature.length !== actualSignature.length) {
    throw new Error('Invalid token signature');
  }
  for (let i = 0; i < expectedSignature.length; i += 1) {
    if (expectedSignature[i] !== actualSignature[i]) {
      throw new Error('Invalid token signature');
    }
  }
  const tokenPayload = decodeJson<Record<string, unknown>>(payload);
  const now = Math.floor(Date.now() / 1000);
  if (typeof tokenPayload.exp === 'number' && tokenPayload.exp < now) {
    throw new Error('Token expired');
  }
  return tokenPayload;
}

export function decodeJwt(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token format');
  }
  return decodeJson<Record<string, unknown>>(parts[1]);
}
