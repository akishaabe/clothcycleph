import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { z } from 'zod';
import { verifyJwt } from './utils/workerJwt.js';
import {
  signupD1,
  loginD1,
  continueWithGoogleD1,
  verifyTwoFactorD1,
  resendTwoFactorCodeD1,
  forgotPasswordD1,
  resetPasswordD1,
  verifyResetCodeD1,
  getProfileD1,
  updateProfileD1,
  changePasswordD1,
  getTwoFactorStatusD1,
  setupTwoFactorD1,
  enableTwoFactorD1,
  disableTwoFactorD1,
  getUsersD1,
  createUserD1,
  updateUserD1,
  deleteUserD1,
  deleteOwnAccountD1,
} from './services/authD1Service.js';
import {
  createSubmissionD1,
  createTrackingUpdateD1,
  getTrackingUpdatesD1,
  getUserSubmissionsD1,
  getSubmissionByIdD1,
  updateSubmissionStatusD1,
} from './services/d1SubmissionService.js';
import {
  getMessageContactsD1,
  getConversationsD1,
  getMessagesD1,
  sendMessageD1,
  markMessageAsReadD1,
} from './services/d1MessageService.js';
import {
  getNotificationsD1,
  getUnreadNotificationCountD1,
  markNotificationAsReadD1,
  markAllNotificationsAsReadD1,
  deleteNotificationD1,
  getNotificationPreferencesD1,
  updateNotificationPreferencesD1,
} from './services/d1NotificationService.js';
import {
  createTransactionD1,
  getTransactionsBySubmissionD1,
  getTransactionsByUserD1,
  getTransactionsByPartnerD1,
  updateTransactionStatusD1,
} from './services/d1TransactionService.js';
import { recordUploadedFileD1, uploadFileToR2 } from './services/d1UploadService.js';
import { generateD1UUID, type D1Database } from './config/d1.js';
import type { EmailProvider } from './services/workerEmailService.js';
import { createSubmissionSchema, createTrackingUpdateSchema, updateSubmissionStatusSchema } from './schemas/submissions.js';
import { sendMessageSchema } from './schemas/messages.js';
import { createTransactionSchema, updateTransactionStatusSchema } from './schemas/transactions.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  updateProfileSchema,
  verifyResetCodeSchema,
} from './schemas/auth.js';
import {
  partnerRuleChangeReplySchema,
  partnerRuleChangeRequestSchema,
  remindDssRequestSchema,
  sendDssRecommendationSchema,
  updateDssRequestStatusSchema,
} from './schemas/dss.js';
import {
  createPartnerRuleChangeRequestD1,
  getPartnerRuleChangeRequestsD1,
  getPartnerDssRequestsD1,
  getDssAuditRunsD1,
  getSubmissionDssD1,
  getUserDssRequestsD1,
  listDssPartnersD1,
  remindDssRequestD1,
  replyToPartnerRuleChangeRequestD1,
  sendRecommendationToPartnerD1,
  updateDssRequestStatusD1,
  updatePartnerRuleChangeRequestStatusD1,
} from './services/d1DssService.js';
import { listPartnerLocationsD1 } from './services/d1GisService.js';
import { getConfig } from './config/env.js';

type WorkerFile = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  name: string;
  type: string;
  size?: number;
};


interface CloudflareEnv {
  DB: D1Database;
  R2_BUCKET: any;
  JWT_SECRET: string;
  TWO_FACTOR_ENCRYPTION_KEY: string;
  CORS_ORIGIN?: string;
  R2_PUBLIC_BASE_URL?: string;
  EMAIL_PROVIDER?: EmailProvider;
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  GOOGLE_CLIENT_ID?: string;
  APP_URL?: string;
  NODE_ENV?: string;
}

type Variables = {
  user: {
    id: string;
    email: string;
    role: string;
  };
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_UPLOAD_SIZE = 10 * 1024; // 10KB
const ALLOWED_UPLOAD_MIMETYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
];
const MAX_MESSAGE_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MESSAGE_ATTACHMENT_MIMETYPES = [
  ...ALLOWED_UPLOAD_MIMETYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const app = new Hono<{ Bindings: CloudflareEnv; Variables: Variables }>();

app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }));
app.use(
  '*',
  cors({
    origin: (origin, c) => {
      const allowedOrigins = (c.env.CORS_ORIGIN || c.env.APP_URL || 'http://localhost:5173')
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);

      if (!origin || allowedOrigins.includes(origin) || /^http:\/\/localhost:517\d$/.test(origin)) {
        return origin || allowedOrigins[0];
      }

      return allowedOrigins[0];
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.onError((error, c) => {
  console.error(error);
  const status = getStatusCode(error);
  return c.json({ 
    error: error.message || 'Internal server error',
    stack: c.env.NODE_ENV === 'development' ? error.stack : undefined 
  }, status as any);
});

const getAuthOptions = (c: any) => {
  const appConfig = getConfig(c.env);
  return {
    jwtSecret: requireWorkerSecret(c, 'JWT_SECRET'),
    totpEncryptionKey: requireWorkerSecret(c, 'TWO_FACTOR_ENCRYPTION_KEY'),
    emailProvider: appConfig.email.provider as EmailProvider,
    emailApiKey: appConfig.email.brevoApiKey || appConfig.email.sendgridApiKey,
    emailFrom: appConfig.email.from,
    appUrl: c.env.APP_URL,
    googleClientId: appConfig.google.clientId,
    exposeDevSecrets: Boolean(!c.env.EMAIL_PROVIDER),
  };
};

const requireWorkerSecret = (c: any, key: keyof CloudflareEnv) => {
  const value = c.env[key];
  if (!value || String(value).startsWith('replace-with')) {
    throw new Error(`${String(key)} is required`);
  }
  return String(value);
};

const requireAuth = async (
  c: Context<{ Bindings: CloudflareEnv; Variables: Variables }>,
  next: Next
) => {
  const authorizationHeader = c.req.header('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const payload = await verifyJwt(token, requireWorkerSecret(c, 'JWT_SECRET'));
    const userId = String(payload.id || '');
    const user = userId
      ? await c.env.DB
          .prepare('SELECT status FROM users WHERE id = ?')
          .bind(userId)
          .first<{ status?: string }>()
      : null;

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    if (String(user.status || 'active').toLowerCase() === 'suspended') {
      return c.json(
        { error: 'Your account has been suspended. Please contact support or the administrator.' },
        403
      );
    }

    c.set('user', payload as any);
    return await next();
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
};

const requireAdmin = async (c: any, next: any) => {
  const user = (c as any).get('user') as { role?: string };
  if (user?.role !== 'admin') {
    return c.json({ error: 'Only admins can access this endpoint' }, 403);
  }
  return await next();
};

const parseJsonBody = async <T extends z.ZodTypeAny>(c: any, schema: T): Promise<z.infer<T>> => {
  const body = await c.req.json();
  return schema.parse(body);
};

const jsonList = (c: any, data: unknown[] | undefined) => {
  const rows = data ?? [];
  return c.json({ data: rows, count: rows.length });
};

const jsonData = (c: any, data: unknown, status = 200) => c.json({ data }, status as any);

const getPartnerSearchOptions = (c: any) => ({
  latitude: parseOptionalNumber(c.req.query('lat')),
  longitude: parseOptionalNumber(c.req.query('lng')),
  pathway: c.req.query('pathway') || undefined,
  radiusKm: parseOptionalNumber(c.req.query('radius_km')),
});

const parseOptionalNumber = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isAllowedMessageAttachment = (file: WorkerFile) => {
  if (ALLOWED_MESSAGE_ATTACHMENT_MIMETYPES.includes(file.type)) {
    return true;
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  return Boolean(extension && ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(extension));
};

const getStatusCode = (error: Error) => {
  if (error instanceof z.ZodError) {
    return 400;
  }

  if (/not found/i.test(error.message)) {
    return 404;
  }

  if (/permission|forbidden|only admins|only admins or partners|suspended/i.test(error.message)) {
    return 403;
  }

  if (/unauthorized|not authenticated/i.test(error.message)) {
    return 401;
  }

  return 400;
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const parseMaybeJson = (value: unknown) => {
  if (!value || typeof value !== 'string') {
    return value ?? null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

app.get('/', (c) => c.json({ message: 'ClothCycle Cloudflare Worker API' }));

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    message: 'ClothCycle Cloudflare Worker API is running',
    database: c.env.DB ? 'bound' : 'missing',
    storage: c.env.R2_BUCKET ? 'bound' : 'missing',
  })
);

app.post('/api/auth/signup', async (c) => {
  const body = await parseJsonBody(c, signupSchema);
  const { email, name, password } = body;

  const result = await signupD1(c.env.DB, email, name, password, getAuthOptions(c));
  return c.json({
    message: 'Signup successful',
    token: result.token,
    user: result.user,
  }, 201);
});

app.post('/api/auth/login', async (c) => {
  const body = await parseJsonBody(c, loginSchema);
  const { email, password } = body;

  const result = await loginD1(
    c.env.DB,
    email,
    password,
    getAuthOptions(c),
    c.req.header('CF-Connecting-IP') || '',
    c.req.header('User-Agent') || ''
  );
  if (result.requiresTwoFactor) {
    return c.json({
      message: 'Two-factor authentication required',
      requiresTwoFactor: true,
      two_factor_token: result.twoFactorToken,
      two_factor_method: result.twoFactorMethod,
      dev_code: result.devCode,
    });
  }

  return c.json({ message: 'Login successful', token: result.token, user: result.user });
});

app.post('/api/auth/google', async (c) => {
  const body = await parseJsonBody(c, googleAuthSchema);
  const { credential, role, mode, terms_accepted } = body;

  const result = await continueWithGoogleD1(
    c.env.DB,
    credential,
    role,
    getAuthOptions(c),
    mode,
    terms_accepted,
    c.req.header('CF-Connecting-IP') || '',
    c.req.header('User-Agent') || ''
  );
  if (result.requiresTwoFactor) {
    return c.json({
      message: 'Two-factor authentication required',
      requiresTwoFactor: true,
      two_factor_token: result.twoFactorToken,
      two_factor_method: result.twoFactorMethod,
      dev_code: result.devCode,
    });
  }

  return c.json({
    message: result.user?.password_setup_required
      ? 'Google signup successful. Set a password to finish account setup.'
      : 'Login successful',
    token: result.token,
    user: result.user,
  });
});

app.post('/api/auth/2fa/verify', async (c) => {
  const body = await c.req.json();
  const { two_factor_token, code } = body;
  if (!two_factor_token || !code) {
    return c.json({ error: 'Missing verification fields' }, 400);
  }

  const result = await verifyTwoFactorD1(
    c.env.DB,
    two_factor_token,
    code,
    getAuthOptions(c),
    c.req.header('CF-Connecting-IP') || '',
    c.req.header('User-Agent') || ''
  );
  return c.json({ message: 'Verification successful', token: result.token, user: result.user });
});

app.post('/api/auth/2fa/resend', async (c) => {
  const body = await c.req.json();
  const { two_factor_token } = body;
  if (!two_factor_token) {
    return c.json({ error: 'Missing two_factor_token' }, 400);
  }

  const result = await resendTwoFactorCodeD1(c.env.DB, two_factor_token, getAuthOptions(c));
  return c.json({
    message: 'A new verification code has been sent.',
    requiresTwoFactor: true,
    two_factor_token: result.twoFactorToken,
    two_factor_method: result.twoFactorMethod,
    dev_code: result.devCode,
  });
});

app.post('/api/auth/forgot-password', async (c) => {
  const body = await parseJsonBody(c, forgotPasswordSchema);
  const { email } = body;

  const result = await forgotPasswordD1(c.env.DB, email, getAuthOptions(c));
  return c.json(result);
});

app.post('/api/auth/reset-password', async (c) => {
  const body = await parseJsonBody(c, resetPasswordSchema);
  const token = body.code || body.token;
  const password = body.password;

  const result = await resetPasswordD1(c.env.DB, token!, password);
  return c.json(result);
});

app.post('/api/auth/verify-reset-code', async (c) => {
  const body = await parseJsonBody(c, verifyResetCodeSchema);
  const token = body.code || body.token;

  const result = await verifyResetCodeD1(c.env.DB, token!);
  return c.json(result);
});

app.get('/api/auth/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const profile = await getProfileD1(c.env.DB, user.id!);
  return jsonData(c, profile);
});

app.put('/api/auth/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await parseJsonBody(c, updateProfileSchema);
  const profile = await updateProfileD1(c.env.DB, user.id!, body);
  return c.json({ message: 'Profile updated', data: profile });
});

app.put('/api/auth/password', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await parseJsonBody(c, changePasswordSchema);

  const result = await changePasswordD1(c.env.DB, user.id!, body.current_password, body.new_password);
  return c.json(result);
});

app.delete('/api/auth/account', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  if (!body.password) {
    return c.json({ error: 'Password is required to delete your account' }, 400);
  }

  const result = await deleteOwnAccountD1(c.env.DB, user.id!, String(body.password));
  return c.json(result);
});

app.get('/api/auth/2fa/status', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const status = await getTwoFactorStatusD1(c.env.DB, user.id!);
  return c.json(status);
});

app.get('/api/auth/2fa/setup', requireAuth, (c) =>
  c.json({ message: 'POST to /api/auth/2fa/setup with { password } to begin setup.' })
);

app.post('/api/auth/2fa/setup', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string };
  const body = await c.req.json();
  const { password } = body;
  if (!password) {
    return c.json({ error: 'Missing password' }, 400);
  }

  const result = await setupTwoFactorD1(c.env.DB, user.id!, password, getAuthOptions(c), body.method);
  return c.json(result);
});

app.post('/api/auth/2fa/enable', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await c.req.json();
  const { password, code } = body;
  if (!password || !code) {
    return c.json({ error: 'Missing enable fields' }, 400);
  }

  const result = await enableTwoFactorD1(c.env.DB, user.id!, password, code, getAuthOptions(c));
  return c.json(result);
});

app.post('/api/auth/2fa/disable', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await c.req.json();
  const { password, code } = body;
  const result = await disableTwoFactorD1(c.env.DB, user.id!, password, code, getAuthOptions(c));
  return c.json(result);
});

app.post('/api/submissions', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await parseJsonBody(c, createSubmissionSchema);
  const submission = await createSubmissionD1(c.env.DB, user.id!, body);
  return c.json({ message: 'Submission created successfully', data: submission }, 201);
});

app.get('/api/submissions', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await getUserSubmissionsD1(c.env.DB, user.id!);
  return jsonList(c, result.results);
});

app.get('/api/submissions/:id', requireAuth, async (c) => {
  const submissionId = c.req.param('id');
  const submission = await getSubmissionByIdD1(c.env.DB, submissionId!);
  if (!submission) {
    return c.json({ error: 'Submission not found' }, 404);
  }
  return jsonData(c, submission);
});

app.get('/api/submissions/:id/tracking', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string; email?: string };
  const submissionId = c.req.param('id');
  const result = await getTrackingUpdatesD1(c.env.DB, submissionId!, {
    id: user.id!,
    role: user.role,
    email: user.email,
  });
  if (!result) {
    return c.json({ error: 'You do not have access to this tracking history' }, 403);
  }
  return jsonList(c, result.results);
});

app.post('/api/submissions/:id/tracking', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string };
  const submissionId = c.req.param('id');
  const body = await parseJsonBody(c, createTrackingUpdateSchema);
  const update = await createTrackingUpdateD1(c.env.DB, submissionId!, { id: user.id!, email: user.email }, body);
  if (!update) {
    return c.json({ error: 'Submission not found' }, 404);
  }
  return c.json({ message: 'Tracking update recorded successfully', data: update }, 201);
});

app.put('/api/submissions/:id/status', requireAuth, async (c) => {
  const submissionId = c.req.param('id');
  const body = await parseJsonBody(c, updateSubmissionStatusSchema);
  const updated = await updateSubmissionStatusD1(c.env.DB, submissionId!, body.status);
  if (!updated) {
    return c.json({ error: 'Submission not found' }, 404);
  }
  return c.json({ message: 'Submission updated successfully', data: updated });
});

app.get('/api/gis/partners', requireAuth, async (c) => {
  const result = await listPartnerLocationsD1(c.env.DB, getPartnerSearchOptions(c));
  return jsonList(c, result.results);
});

app.get('/api/dss/partners', requireAuth, async (c) => {
  const result = await listDssPartnersD1(c.env.DB, getPartnerSearchOptions(c));
  return jsonList(c, result.results);
});

app.get('/api/dss/submissions/:submissionId', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const data = await getSubmissionDssD1(c.env.DB, c.req.param('submissionId')!, user.id!, user.role);
  return jsonData(c, data);
});

app.post('/api/dss/send', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const body = await parseJsonBody(c, sendDssRecommendationSchema);
  const data = await sendRecommendationToPartnerD1(c.env.DB, user.id!, user.role, body);
  return c.json({ message: 'Recommendation sent to partner', data }, 201);
});

app.get('/api/dss/requests/user', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await getUserDssRequestsD1(c.env.DB, user.id!);
  return jsonList(c, result.results);
});

app.get('/api/dss/requests/partner', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string; role?: string };
  const result = await getPartnerDssRequestsD1(c.env.DB, user.id!, user.email, user.role);
  return jsonList(c, result.results);
});

app.get('/api/dss/audit', requireAuth, requireAdmin, async (c) => {
  const result = await getDssAuditRunsD1(c.env.DB);
  return jsonList(c, result.results);
});

app.get('/api/dss/audit/export', requireAuth, requireAdmin, async (c) => {
  const result = await getDssAuditRunsD1(c.env.DB);
  const rows = result.results || [];
  const header = [
    'created_at',
    'engine_version',
    'recommended_pathway',
    'rank',
    'score',
    'confidence',
    'submission_name',
    'item_type',
    'partner_name',
    'requested_by_name',
    'explanation',
  ];
  const csv = [
    header.join(','),
    ...rows.map((row: any) =>
      [
        row.created_at,
        row.engine_version,
        row.recommended_pathway,
        row.rank,
        row.score,
        row.confidence,
        row.submission_name,
        row.item_type,
        row.partner_name,
        row.requested_by_name,
        row.explanation,
      ].map(csvCell).join(',')
    ),
  ].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="clothcycle-dss-audit.csv"',
    },
  });
});

app.get('/api/dss/rule-change-requests', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string; role?: string };
  if (!['admin', 'partner'].includes(String(user.role))) {
    return c.json({ error: 'Only partners and admins can view partner rule change requests' }, 403);
  }
  const result = await getPartnerRuleChangeRequestsD1(c.env.DB, user);
  return jsonList(c, result.results);
});

app.post('/api/dss/rule-change-requests', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string };
  const body = await parseJsonBody(c, partnerRuleChangeRequestSchema);
  const data = await createPartnerRuleChangeRequestD1(c.env.DB, user.id!, user.email, body);
  return c.json({ message: 'Rule change request submitted for admin review', data }, 201);
});

app.post('/api/dss/rule-change-requests/:id/replies', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string; role?: string };
  const requestId = c.req.param('id');
  const body = await parseJsonBody(c, partnerRuleChangeReplySchema);
  const data = await replyToPartnerRuleChangeRequestD1(c.env.DB, user, requestId!, body.message);
  return c.json({ message: 'Reply saved', data }, 201);
});

app.put('/api/dss/rule-change-requests/:id/status', requireAuth, requireAdmin, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const requestId = c.req.param('id');
  const body = await c.req.json();
  const data = await updatePartnerRuleChangeRequestStatusD1(c.env.DB, user.id!, requestId!, {
    status: String(body.status || ''),
    admin_note: body.admin_note ? String(body.admin_note) : undefined,
  });
  return c.json({ message: 'Rule request status updated', data });
});

app.post('/api/dss/requests/:id/remind', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await parseJsonBody(c, remindDssRequestSchema);
  const result = await remindDssRequestD1(c.env.DB, user.id!, c.req.param('id')!, body.message);
  return c.json({ message: `Reminder sent to ${result.partnerName}.`, data: result.request });
});

app.put('/api/dss/requests/:id/status', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string; role?: string };
  const body = await parseJsonBody(c, updateDssRequestStatusSchema);
  const data = await updateDssRequestStatusD1(
    c.env.DB,
    user.id!,
    user.email,
    user.role,
    c.req.param('id')!,
    body.status,
    body.notes,
    body.outcome_title,
    body.outcome_description,
    body.outcome_photos
  );
  return c.json({ message: 'Request status updated', data });
});

app.get('/api/messages/contacts', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const result = await getMessageContactsD1(c.env.DB, user.id!, user.role as string);
  return jsonList(c, result.results);
});

app.get('/api/messages/conversations', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const result = await getConversationsD1(c.env.DB, user.id!, user.role as string);
  return jsonList(c, result.results);
});

app.get('/api/messages/unread-count', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const result = await c.env.DB
    .prepare(
      `SELECT COUNT(*) AS unread_count
       FROM messages m
       JOIN users sender ON sender.id = m.from_user_id
       WHERE m.to_user_id = ?
         AND m.read = 0
         AND (
           (? = 'user' AND sender.role = 'partner')
           OR (? = 'partner' AND sender.role = 'user')
           OR (? = 'admin' AND sender.role = 'admin')
         )`
    )
    .bind(user.id, user.role, user.role, user.role)
    .first<{ unread_count: number }>();
  return c.json({ unread_count: Number(result?.unread_count || 0) });
});

app.get('/api/messages/:userId', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const otherUserId = c.req.param('userId');
  const result = await getMessagesD1(c.env.DB, user.id!, otherUserId!);
  return jsonList(c, result.results);
});

app.post('/api/messages', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await parseJsonBody(c, sendMessageSchema);
  const message = await sendMessageD1(c.env.DB, user.id!, body.to_user_id, body.content, body.attachments);
  return c.json({ message: 'Message sent successfully', data: message }, 201);
});

app.put('/api/messages/:id/read', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const messageId = c.req.param('id');
  const updated = await markMessageAsReadD1(c.env.DB, messageId!, user.id!);
  if (!updated) {
    return c.json({ error: 'Message not found' }, 404);
  }
  return jsonData(c, updated);
});

app.post('/api/messages/attachments', requireAuth, async (c) => {
  const user = c.get('user');
  if (!c.env.R2_BUCKET || typeof c.env.R2_BUCKET.put !== 'function') {
    return c.json({ error: 'R2 bucket is not configured' }, 503);
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as WorkerFile | null;
  if (!file || typeof file.arrayBuffer !== 'function') {
    return c.json({ error: 'Missing file' }, 400);
  }

  if (!isAllowedMessageAttachment(file)) {
    return c.json({ error: 'Only images, PDF, Word, and Excel files can be attached' }, 400);
  }

  if (file.size != null && file.size > MAX_MESSAGE_ATTACHMENT_SIZE) {
    return c.json({ error: 'Message attachments must be 50MB or smaller' }, 400);
  }

  const fileData = await file.arrayBuffer();
  if (fileData.byteLength > MAX_MESSAGE_ATTACHMENT_SIZE) {
    return c.json({ error: 'Message attachments must be 50MB or smaller' }, 400);
  }

  const apiBaseUrl = c.env.R2_PUBLIC_BASE_URL || new URL(c.req.url).origin;
  const upload = await uploadFileToR2(c.env.R2_BUCKET, fileData, file.name, file.type || 'application/octet-stream', apiBaseUrl);
  await recordUploadedFileD1(c.env.DB, {
    userId: user.id!,
    storageKey: upload.key,
    url: upload.url,
    originalName: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: fileData.byteLength,
    purpose: 'message_attachment',
  });

  return c.json({
    message: 'Attachment uploaded successfully',
    attachment: {
      filename: file.name,
      url: upload.url,
      key: upload.key,
      mimetype: file.type || 'application/octet-stream',
      size: fileData.byteLength,
    },
  }, 201);
});

app.post('/api/upload', requireAuth, async (c) => {
  const user = c.get('user');
  if (!c.env.R2_BUCKET || typeof c.env.R2_BUCKET.put !== 'function') {
    return c.json({ error: 'R2 bucket is not configured' }, 503);
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as WorkerFile | null;
  if (!file || typeof file.arrayBuffer !== 'function') {
    return c.json({ error: 'Missing file' }, 400);
  }

  if (!ALLOWED_UPLOAD_MIMETYPES.includes(file.type)) {
    return c.json({ error: 'Only image files are allowed' }, 400);
  }

  if (file.size != null) {
    if (file.size < MIN_UPLOAD_SIZE) {
      return c.json({ error: 'File size must be at least 10KB' }, 400);
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }
  }

  const fileData = await file.arrayBuffer();
  if (fileData.byteLength > MAX_UPLOAD_SIZE) {
    return c.json({ error: 'File size must be less than 5MB' }, 400);
  }

  const apiBaseUrl = c.env.R2_PUBLIC_BASE_URL || new URL(c.req.url).origin;
  const upload = await uploadFileToR2(c.env.R2_BUCKET, fileData, file.name, file.type, apiBaseUrl);
  await recordUploadedFileD1(c.env.DB, {
    userId: user.id!,
    storageKey: upload.key,
    url: upload.url,
    originalName: file.name,
    contentType: file.type,
    sizeBytes: fileData.byteLength,
    purpose: 'image',
  });

  return c.json({ message: 'File uploaded successfully', ...upload }, 201);
});

app.get('/api/uploads/:key', async (c) => {
  if (!c.env.R2_BUCKET || typeof c.env.R2_BUCKET.get !== 'function') {
    return c.json({ error: 'R2 bucket is not configured' }, 503);
  }

  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(key);
  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      etag: object.httpEtag || object.etag || '',
      'cache-control': 'public, max-age=31536000, immutable',
      'cross-origin-resource-policy': 'cross-origin',
    },
  });
});

app.get('/api/notifications', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await getNotificationsD1(c.env.DB, user.id!, c.req.query('unread') === 'true');
  return jsonList(c, result.results);
});

app.get('/api/notifications/count', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const count = await getUnreadNotificationCountD1(c.env.DB, user.id!);
  return c.json({ unread_count: count });
});

app.get('/api/notifications/preferences', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const preferences = await getNotificationPreferencesD1(c.env.DB, user.id!);
  return c.json({ data: preferences });
});

app.put('/api/notifications/preferences', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const body = await c.req.json();
  const preferences = await updateNotificationPreferencesD1(c.env.DB, user.id!, {
    email_notifications: body.email_notifications,
    push_notifications: body.push_notifications,
    newsletter: body.newsletter,
  });
  return c.json({ message: 'Notification preferences saved', data: preferences });
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (c) => {
  const role = c.req.query('role')?.toString();
  const result = await getUsersD1(c.env.DB, role);
  return jsonList(c, result.results);
});

app.post('/api/admin/users', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json();
  const user = await createUserD1(c.env.DB, {
    name: body.name,
    email: body.email,
    role: body.role,
    status: body.status,
    phone: body.phone,
    address: body.address,
    partner_id: body.partner_id,
    password: body.password,
  });
  return c.json({ message: 'User created successfully', data: user }, 201);
});

app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json();
  const user = await updateUserD1(c.env.DB, userId!, {
    name: body.name,
    email: body.email,
    role: body.role,
    status: body.status,
    phone: body.phone,
    address: body.address,
    partner_id: body.partner_id,
  });
  return c.json({ message: 'User updated successfully', data: user });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param('id');
  const user = c.get('user') as any;
  await deleteUserD1(c.env.DB, userId!, user?.id);
  return c.json({ message: 'User deleted successfully' });
});

app.get('/api/admin/deleted-records', requireAuth, requireAdmin, async (c) => {
  const url = new URL(c.req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = Math.min(100, Math.max(10, Number(url.searchParams.get('limit') || 25)));
  const offset = (page - 1) * limit;
  const clauses: string[] = [];
  const params: any[] = [];
  const push = (value: any) => {
    params.push(value);
    return '?';
  };

  const entityType = url.searchParams.get('entity_type');
  if (entityType) {
    clauses.push(`dr.entity_type = ${push(entityType.toLowerCase())}`);
  }

  const deletedBy = url.searchParams.get('deleted_by');
  if (deletedBy) {
    const value = `%${deletedBy.toLowerCase()}%`;
    clauses.push(`(
      lower(COALESCE(dr.deleted_by_user_id, '')) LIKE ${push(value)}
      OR lower(COALESCE(u.name, '')) LIKE ${push(value)}
      OR lower(COALESCE(u.email, '')) LIKE ${push(value)}
      OR lower(COALESCE(u.role, '')) LIKE ${push(value)}
    )`);
  }

  const keyword = url.searchParams.get('keyword');
  if (keyword) {
    const value = `%${keyword.toLowerCase()}%`;
    clauses.push(`(
      lower(COALESCE(dr.entity_type, '')) LIKE ${push(value)}
      OR lower(COALESCE(dr.entity_id, '')) LIKE ${push(value)}
      OR lower(COALESCE(dr.snapshot, '')) LIKE ${push(value)}
      OR lower(COALESCE(u.name, '')) LIKE ${push(value)}
      OR lower(COALESCE(u.email, '')) LIKE ${push(value)}
    )`);
  }

  const dateFrom = url.searchParams.get('date_from');
  if (dateFrom) {
    clauses.push(`dr.deleted_at >= ${push(dateFrom)}`);
  }

  const dateTo = url.searchParams.get('date_to');
  if (dateTo) {
    clauses.push(`dr.deleted_at < datetime(${push(dateTo)}, '+1 day')`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const countResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) AS count
       FROM deleted_records dr
       LEFT JOIN users u ON u.id = dr.deleted_by_user_id
       ${where}`
    )
    .bind(...params)
    .first();
  const result = await c.env.DB
    .prepare(
      `SELECT dr.*, u.name AS deleted_by_name, u.email AS deleted_by_email
       FROM deleted_records dr
       LEFT JOIN users u ON u.id = dr.deleted_by_user_id
       ${where}
       ORDER BY dr.deleted_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();
  const records = (result.results || []).map((row: any) => ({
    ...row,
    snapshot: parseMaybeJson(row.snapshot),
  }));
  const count = Number((countResult as any)?.count || 0);
  return c.json({ data: records, count, page, limit, total_pages: Math.max(1, Math.ceil(count / limit)) });
});

app.get('/api/admin/submissions', requireAuth, requireAdmin, async (c) => {
  const result = await c.env.DB
    .prepare(
      `SELECT
         s.*,
         u.name AS user_name,
         u.email AS user_email,
         p.name AS assigned_partner_name
       FROM submissions s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN partners p ON p.id = s.assigned_partner_id
       ORDER BY s.created_at DESC
       LIMIT 200`
    )
    .all();
  return jsonList(c, result.results || []);
});

app.put('/api/admin/submissions/:id/status', requireAuth, requireAdmin, async (c) => {
  const body = await c.req.json();
  const status = String(body.status || '').toLowerCase();
  if (!['pending', 'verified', 'processed', 'rejected'].includes(status)) {
    return c.json({ error: 'Invalid submission status' }, 400);
  }

  const result = await c.env.DB
    .prepare('UPDATE submissions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING *')
    .bind(status, c.req.param('id'))
    .first();
  if (!result) {
    return c.json({ error: 'Submission not found' }, 404);
  }

  return c.json({ message: 'Submission status updated', data: result });
});

app.get('/api/admin/dss-rules', requireAuth, requireAdmin, async (c) => {
  const result = await c.env.DB
    .prepare('SELECT * FROM dss_rules ORDER BY pathway, category, rule_key')
    .all();
  return jsonList(c, result.results || []);
});

app.post('/api/admin/dss-rules', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  if (!body.rule_key) {
    return c.json({ error: 'Rule key is required' }, 400);
  }

  const id = generateD1UUID();
  const result = await c.env.DB
    .prepare(
      `INSERT INTO dss_rules (
         id, rule_key, pathway, category, question_key, expected_values,
         weight, active, description, created_by_user_id, updated_by_user_id
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      id,
      body.rule_key,
      body.pathway || null,
      body.category || null,
      body.question_key || null,
      JSON.stringify(body.expected_values || []),
      Number(body.weight || 0),
      body.active === false ? 0 : 1,
      body.description || null,
      user.id,
      user.id
    )
    .first();
  return c.json({ message: 'DSS rule created', data: result }, 201);
});

app.put('/api/admin/dss-rules/:id', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const result = await c.env.DB
    .prepare(
      `UPDATE dss_rules
       SET rule_key = COALESCE(?, rule_key),
           pathway = ?,
           category = ?,
           question_key = ?,
           expected_values = COALESCE(?, expected_values),
           weight = COALESCE(?, weight),
           active = COALESCE(?, active),
           description = ?,
           updated_by_user_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING *`
    )
    .bind(
      body.rule_key || null,
      body.pathway || null,
      body.category || null,
      body.question_key || null,
      body.expected_values == null ? null : JSON.stringify(body.expected_values),
      body.weight == null ? null : Number(body.weight),
      body.active == null ? null : Number(Boolean(body.active)),
      body.description || null,
      user.id,
      c.req.param('id')
    )
    .first();
  if (!result) {
    return c.json({ error: 'DSS rule not found' }, 404);
  }
  return c.json({ message: 'DSS rule updated', data: result });
});

app.delete('/api/admin/dss-rules/:id', requireAuth, requireAdmin, async (c) => {
  const user = c.get('user') as any;
  const result = await c.env.DB
    .prepare('DELETE FROM dss_rules WHERE id = ? RETURNING *')
    .bind(c.req.param('id'))
    .first();
  if (!result) {
    return c.json({ error: 'DSS rule not found' }, 404);
  }
  try {
    await c.env.DB
      .prepare(
        `INSERT INTO deleted_records (id, entity_type, entity_id, snapshot, deleted_by_user_id)
         VALUES (?, 'dss_rule', ?, ?, ?)`
      )
      .bind(generateD1UUID(), c.req.param('id'), JSON.stringify(result), user?.id || null)
      .run();
  } catch (error) {
    console.warn('Unable to archive deleted DSS rule record:', error);
  }
  return c.json({ message: 'DSS rule deleted', data: result });
});

app.put('/api/notifications/:id/read', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const notificationId = c.req.param('id');
  const updated = await markNotificationAsReadD1(c.env.DB, notificationId!, user.id!);
  if (!updated) {
    return c.json({ error: 'Notification not found' }, 404);
  }
  return c.json({ message: 'Notification marked read', data: updated });
});

app.put('/api/notifications/read-all', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const updated = await markAllNotificationsAsReadD1(c.env.DB, user.id!);
  return c.json({ message: 'All notifications marked as read', count: updated.length });
});

app.delete('/api/notifications/:id', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const notificationId = c.req.param('id');
  const deleted = await deleteNotificationD1(c.env.DB, notificationId!, user.id!);
  if (!deleted) {
    return c.json({ error: 'Notification not found' }, 404);
  }
  try {
    await c.env.DB
      .prepare(
        `INSERT INTO deleted_records (id, entity_type, entity_id, snapshot, deleted_by_user_id)
         VALUES (?, 'notification', ?, ?, ?)`
      )
      .bind(generateD1UUID(), notificationId, JSON.stringify(deleted), user.id || null)
      .run();
  } catch (error) {
    console.warn('Unable to archive deleted notification record:', error);
  }
  return c.json({ message: 'Notification deleted', data: deleted });
});

app.post('/api/transactions', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const body = await parseJsonBody(c, createTransactionSchema);
  const transaction = await createTransactionD1(c.env.DB, user.id!, user.role as string, body);
  return c.json({ message: 'Transaction created successfully', data: transaction }, 201);
});

app.get('/api/transactions/submission/:submissionId', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const submissionId = c.req.param('submissionId');
  const result = await getTransactionsBySubmissionD1(c.env.DB, user.id!, user.role as string, submissionId!);
  return jsonList(c, result.results);
});

app.get('/api/transactions/user', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await getTransactionsByUserD1(c.env.DB, user.id!);
  return jsonList(c, result.results);
});

app.get('/api/transactions/partner/:partnerId', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const result = await getTransactionsByPartnerD1(c.env.DB, user.id!, user.role as string, c.req.param('partnerId')!);
  return jsonList(c, result.results);
});

app.put('/api/transactions/:id', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const transactionId = c.req.param('id');
  const body = await parseJsonBody(c, updateTransactionStatusSchema);
  const result = await updateTransactionStatusD1(c.env.DB, user.id!, user.role as string, transactionId!, body.status, body.notes);
  return c.json({ message: 'Transaction updated successfully', data: result });
});

app.all('*', (c) => c.json({ error: 'Route not found' }, 404));

export default app;
