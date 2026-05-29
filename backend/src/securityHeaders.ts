import type { Context, Next } from 'hono';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://clothcycleph.com https://api.clothcycleph.com https://*.workers.dev https://*.pages.dev https://accounts.google.com https://nominatim.openstreetmap.org http://localhost:* http://127.0.0.1:*",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

export async function contentSecurityPolicy(c: Context, next: Next) {
  await next();
  c.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
}
