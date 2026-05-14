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
  sendAuthenticatedSmsTwoFactorCodeD1,
  forgotPasswordD1,
  resetPasswordD1,
  verifyResetCodeD1,
  getProfileD1,
  updateProfileD1,
  getTwoFactorStatusD1,
  setupTwoFactorD1,
  enableTwoFactorD1,
  disableTwoFactorD1,
  getUsersD1,
  createUserD1,
  updateUserD1,
  deleteUserD1,
} from './services/authD1Service.js';
import {
  createSubmissionD1,
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
} from './services/d1NotificationService.js';
import {
  createTransactionD1,
  getTransactionsBySubmissionD1,
  getTransactionsByUserD1,
  getTransactionsByPartnerD1,
  updateTransactionStatusD1,
} from './services/d1TransactionService.js';
import { uploadFileToR2 } from './services/d1UploadService.js';
import type { D1Database } from './config/d1.js';
import type { EmailProvider } from './services/workerEmailService.js';
import { createSubmissionSchema, updateSubmissionStatusSchema } from './schemas/submissions.js';
import { sendMessageSchema } from './schemas/messages.js';
import { createTransactionSchema, updateTransactionStatusSchema } from './schemas/transactions.js';
import {
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
  sendRecommendationToPartnerD1,
  updateDssRequestStatusD1,
} from './services/d1DssService.js';
import { listPartnerLocationsD1 } from './services/d1GisService.js';

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
  EMAIL_PROVIDER?: EmailProvider;
  SMS_PROVIDER?: 'twilio';
  BREVO_API_KEY?: string;
  SENDGRID_API_KEY?: string;
  EMAIL_FROM?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_FROM_NUMBER?: string;
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

const app = new Hono<{ Bindings: CloudflareEnv; Variables: Variables }>();

app.use('*', secureHeaders());
app.use(
  '*',
  cors({
    origin: '*',
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

const getAuthOptions = (c: any) => ({
  jwtSecret: c.env.JWT_SECRET || 'CHANGE_ME',
  totpEncryptionKey: c.env.TWO_FACTOR_ENCRYPTION_KEY || 'CHANGE_ME_TOO',
  emailProvider: c.env.EMAIL_PROVIDER,
  emailApiKey: c.env.BREVO_API_KEY || c.env.SENDGRID_API_KEY,
  emailFrom: c.env.EMAIL_FROM,
  smsProvider: c.env.SMS_PROVIDER,
  twilioAccountSid: c.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: c.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: c.env.TWILIO_FROM_NUMBER,
  appUrl: c.env.APP_URL,
  googleClientId: c.env.GOOGLE_CLIENT_ID,
  exposeDevSecrets: Boolean(!c.env.EMAIL_PROVIDER),
});

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
    const payload = await verifyJwt(token, c.env.JWT_SECRET || 'CHANGE_ME');
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

const getStatusCode = (error: Error) => {
  if (error instanceof z.ZodError) {
    return 400;
  }

  if (/not found/i.test(error.message)) {
    return 404;
  }

  if (/permission|forbidden|only admins|only admins or partners/i.test(error.message)) {
    return 403;
  }

  if (/unauthorized|not authenticated/i.test(error.message)) {
    return 401;
  }

  return 400;
};

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

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
  const body = await c.req.json();
  const { email, name, password } = body;
  if (!email || !name || !password) {
    return c.json({ error: 'Missing signup fields' }, 400);
  }

  const result = await signupD1(c.env.DB, email, name, password, getAuthOptions(c));
  return c.json({
    message: 'Signup successful - please verify your email with the code sent.',
    two_factor_token: result.twoFactorToken,
    requiresTwoFactor: result.requiresTwoFactor,
    two_factor_method: result.twoFactorMethod,
    dev_code: result.devCode,
  });
});

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;
  if (!email || !password) {
    return c.json({ error: 'Missing login fields' }, 400);
  }

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
  const body = await c.req.json();
  const { credential, role } = body;
  if (!credential || !role) {
    return c.json({ error: 'Missing Google login fields' }, 400);
  }

  const result = await continueWithGoogleD1(
    c.env.DB,
    credential,
    role,
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
  const body = await c.req.json();
  const { email } = body;
  if (!email) {
    return c.json({ error: 'Missing email' }, 400);
  }

  const result = await forgotPasswordD1(c.env.DB, email, getAuthOptions(c));
  return c.json(result);
});

app.post('/api/auth/reset-password', async (c) => {
  const body = await c.req.json();
  const token = body.code || body.token;
  const password = body.password;

  if (!token || !password) {
    return c.json({ error: 'Missing reset fields' }, 400);
  }

  const result = await resetPasswordD1(c.env.DB, token, password);
  return c.json(result);
});

app.post('/api/auth/verify-reset-code', async (c) => {
  const body = await c.req.json();
  const token = body.code || body.token;

  if (!token) {
    return c.json({ error: 'Missing reset code' }, 400);
  }

  const result = await verifyResetCodeD1(c.env.DB, token);
  return c.json(result);
});

app.get('/api/auth/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const profile = await getProfileD1(c.env.DB, user.id!);
  return jsonData(c, profile);
});

app.put('/api/auth/profile', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const profile = await updateProfileD1(c.env.DB, user.id!, body);
  return c.json({ message: 'Profile updated', data: profile });
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

  const result = await setupTwoFactorD1(c.env.DB, user.id!, password, getAuthOptions(c), body.method, body.phone);
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

app.post('/api/auth/2fa/sms/send', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await sendAuthenticatedSmsTwoFactorCodeD1(c.env.DB, user.id!, getAuthOptions(c));
  return c.json({ message: result.message, dev_code: result.devCode });
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

app.get('/api/dss/rule-change-requests', requireAuth, requireAdmin, async (c) => {
  const result = await getPartnerRuleChangeRequestsD1(c.env.DB);
  return jsonList(c, result.results);
});

app.post('/api/dss/rule-change-requests', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; email?: string };
  const body = await parseJsonBody(c, partnerRuleChangeRequestSchema);
  const data = await createPartnerRuleChangeRequestD1(c.env.DB, user.id!, user.email, body);
  return c.json({ message: 'Rule change request submitted for admin review', data }, 201);
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
    body.notes
  );
  return c.json({ message: 'Request status updated', data });
});

app.get('/api/messages/contacts', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string; role?: string };
  const result = await getMessageContactsD1(c.env.DB, user.id!, user.role as string);
  return jsonList(c, result.results);
});

app.get('/api/messages/conversations', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await getConversationsD1(c.env.DB, user.id!);
  return jsonList(c, result.results);
});

app.get('/api/messages/unread-count', requireAuth, async (c) => {
  const user = (c as any).get('user') as { id?: string };
  const result = await c.env.DB
    .prepare('SELECT COUNT(*) AS unread_count FROM messages WHERE to_user_id = ? AND read = 0')
    .bind(user.id)
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
  const message = await sendMessageD1(c.env.DB, user.id!, body.to_user_id, body.content);
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

app.post('/api/upload', requireAuth, async (c) => {
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

  const upload = await uploadFileToR2(c.env.R2_BUCKET, fileData, file.name, file.type);
  return c.json({ message: 'File uploaded successfully', ...upload }, 201);
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
  await deleteUserD1(c.env.DB, userId!);
  return c.json({ message: 'User deleted successfully' });
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
