import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { bearerAuth } from 'hono/bearer-auth';
import {
  signupD1,
  loginD1,
  verifyTwoFactorD1,
  getProfileD1,
  updateProfileD1,
} from './services/authD1Service';
import { verifyToken } from './utils/auth';
import { D1Database } from './config/d1';

type CloudflareEnv = {
  DB: D1Database;
  R2_BUCKET?: any; // Cloudflare R2 bucket binding
  BACKEND_ORIGIN?: string;
  JWT_SECRET?: string;
  TWO_FACTOR_ENCRYPTION_KEY?: string;
  EMAIL_PROVIDER?: string;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
};

type HonoEnv = {
  Bindings: CloudflareEnv;
  Variables: {
    user?: {
      id: string;
      email: string;
      role: 'user' | 'partner' | 'admin';
    };
  };
};

const app = new Hono<HonoEnv>().basePath('/api');

// Security middleware
app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: (origin) => origin || '',
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

// Health check endpoint
app.get('/health', (c) => {
  const db = c.env.DB;
  return c.json({
    status: 'ok',
    runtime: 'cloudflare-workers',
    framework: 'hono',
    database: db ? 'bound' : 'missing',
    storage: c.env.R2_BUCKET ? 'bound' : 'missing',
  });
});

// Auth middleware for protected routes
const authMiddleware = async (c: any, next: any) => {
  const auth = c.req.header('Authorization');
  const token = auth?.replace('Bearer ', '');

  if (!token) {
    return c.json({ error: 'Unauthorized: No token provided' }, 401);
  }

  try {
    const decoded = verifyToken(token);
    c.set('user', decoded);
    await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized: Invalid token' }, 401);
  }
};

// ============ AUTH ROUTES ============

const auth = new Hono<HonoEnv>();

// Signup
auth.post('/signup', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return c.json({ error: 'Email, name, and password are required' }, 400);
    }

    const result = await signupD1(db, email, name, password);

    return c.json(
      {
        message: 'User created successfully. Check your email for verification code.',
        requiresTwoFactor: true,
        two_factor_token: result.twoFactorToken,
        two_factor_method: 'email',
      },
      201
    );
  } catch (error) {
    const message = (error as Error).message;
    return c.json({ error: message || 'Signup failed' }, 400);
  }
});

// Login
auth.post('/login', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const { email, password } = body;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    const ipAddress = c.req.header('cf-connecting-ip');
    const userAgent = c.req.header('user-agent');

    const result = await loginD1(db, email, password, ipAddress, userAgent);

    if (result.requiresTwoFactor) {
      return c.json({
        message: `Two-factor verification required. ${
          result.twoFactorMethod === 'totp'
            ? 'Enter your authenticator code.'
            : 'Check your email for verification code.'
        }`,
        requiresTwoFactor: true,
        two_factor_token: result.twoFactorToken,
        two_factor_method: result.twoFactorMethod,
      });
    }

    return c.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    const message = (error as Error).message;
    return c.json({ error: message || 'Login failed' }, 400);
  }
});

// Verify 2FA
auth.post('/2fa/verify', async (c) => {
  try {
    const db = c.env.DB;
    const body = await c.req.json();
    const { two_factor_token, code } = body;

    if (!two_factor_token || !code) {
      return c.json({ error: 'Two-factor token and code are required' }, 400);
    }

    const ipAddress = c.req.header('cf-connecting-ip');
    const userAgent = c.req.header('user-agent');

    const result = await verifyTwoFactorD1(db, two_factor_token, code, ipAddress, userAgent);

    return c.json({
      message: 'Login successful',
      user: result.user,
      token: result.token,
    });
  } catch (error) {
    const message = (error as Error).message;
    return c.json({ error: message || 'Two-factor verification failed' }, 400);
  }
});

// Get profile (protected)
auth.get('/profile', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const profile = await getProfileD1(db, user.id);
    return c.json({ data: profile });
  } catch (error) {
    const message = (error as Error).message;
    return c.json({ error: message || 'Failed to get profile' }, 400);
  }
});

// Update profile (protected)
auth.put('/profile', authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const user = c.get('user');
    const body = await c.req.json();

    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const updated = await updateProfileD1(db, user.id, body);
    return c.json({
      message: 'Profile updated successfully',
      data: updated,
    });
  } catch (error) {
    const message = (error as Error).message;
    return c.json({ error: message || 'Failed to update profile' }, 400);
  }
});

// Routes info
auth.get('/routes', (c) => {
  return c.json({
    message: 'Cloudflare Workers auth API with D1 database',
    status: 'active',
    routes: [
      'POST /api/auth/signup',
      'POST /api/auth/login',
      'POST /api/auth/2fa/verify',
      'GET /api/auth/profile (protected)',
      'PUT /api/auth/profile (protected)',
    ],
    note: 'Auth service is now running on D1 (Cloudflare SQLite). Additional endpoints being ported.',
  });
});

// Fallback auth routes (not yet ported)
auth.all('*', (c) => {
  return c.json(
    {
      error: 'Route not yet ported to D1',
      next: 'More auth endpoints (2FA setup, password reset, etc.) are being ported to D1.',
    },
    501
  );
});

app.route('/auth', auth);

// ============ FALLBACK PROXY (for non-auth routes) ============

app.all('*', async (c) => {
  const backendOrigin = c.env.BACKEND_ORIGIN;

  if (!backendOrigin) {
    return c.json(
      {
        error: 'API routes not yet ported to D1. Set BACKEND_ORIGIN to proxy to Express backend.',
        status: 'partial',
        auth_routes: 'available',
        other_routes: 'requires BACKEND_ORIGIN',
      },
      501
    );
  }

  return proxyToBackend(c, backendOrigin);
});

/**
 * Proxy requests to the Express backend for routes not yet ported to D1
 */
async function proxyToBackend(c: any, backendOrigin: string) {
  const incomingUrl = new URL(c.req.url);
  const relativePath = incomingUrl.pathname.replace(/^\/api/, '') || '/';
  const queryString = incomingUrl.search || '';
  const targetUrl = `${backendOrigin.replace(/\/$/, '')}${relativePath}${queryString}`;

  const headers = new Headers(c.req.headers);
  headers.delete('host');
  headers.delete('content-length');

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);
  const body = hasBody ? await c.req.raw.clone().arrayBuffer() : undefined;

  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers,
      body,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('transfer-encoding');

    const responseBody = await response.arrayBuffer();
    return c.body(responseBody, response.status, Object.fromEntries(responseHeaders.entries()));
  } catch (error) {
    return c.json(
      {
        error: 'Failed to reach backend',
        message: (error as Error).message,
      },
      502
    );
  }
}

export default app;

