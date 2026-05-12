import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

type CloudflareEnv = {
  DB?: unknown;
  R2_BUCKET?: unknown;
  JWT_SECRET?: string;
  TWO_FACTOR_ENCRYPTION_KEY?: string;
  EMAIL_PROVIDER?: string;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
};

const app = new Hono<{ Bindings: CloudflareEnv }>().basePath('/api');

app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin) => origin || '',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    runtime: 'cloudflare-workers',
    framework: 'hono',
    database: c.env.DB ? 'bound' : 'missing',
    storage: c.env.R2_BUCKET ? 'bound' : 'missing',
  });
});

const auth = new Hono<{ Bindings: CloudflareEnv }>();

auth.get('/routes', (c) => {
  return c.json({
    message: 'Hono auth migration scaffold is active.',
    routes: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'POST /api/auth/2fa/verify',
      'POST /api/auth/forgot-password',
      'POST /api/auth/reset-password',
      'GET /api/auth/profile',
      'PUT /api/auth/profile',
      'GET /api/auth/2fa/status',
      'POST /api/auth/2fa/setup',
      'POST /api/auth/2fa/enable',
      'POST /api/auth/2fa/disable',
    ],
  });
});

auth.all('*', (c) => {
  return c.json(
    {
      error: 'Route not ported to Hono yet',
      next: 'Move shared auth services out of Express controllers, then bind them here.',
    },
    501
  );
});

app.route('/auth', auth);

export default app;
