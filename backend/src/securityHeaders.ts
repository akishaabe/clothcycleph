import type { Context, Next } from 'hono';

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' https://accounts.google.com https://static.cloudflareinsights.com",
  "style-src 'self' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://clothcycleph.com https://api.clothcycleph.com https://*.workers.dev https://*.pages.dev https://accounts.google.com https://cloudflareinsights.com https://nominatim.openstreetmap.org http://localhost:* http://127.0.0.1:*",
  "frame-src https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

export const STRICT_TRANSPORT_SECURITY = 'max-age=31536000; includeSubDomains; preload';

export async function contentSecurityPolicy(c: Context, next: Next) {
  await next();
  c.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  c.header('Strict-Transport-Security', STRICT_TRANSPORT_SECURITY);
  c.header('X-Frame-Options', 'DENY');
}
