import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ZodError, type ZodSchema } from 'zod';
import { config, getConfig, type EnvRecord } from './config/env.js';
import { query } from './config/database.js';
import { verifyToken } from './utils/auth.js';
import { AppError } from './utils/errorHandler.js';
import type { AuthUser } from './types/http.js';
import {
  changePassword,
  continueWithGoogle,
  deleteOwnAccount,
  disableTwoFactor,
  enableTwoFactor,
  forgotPassword,
  getProfile,
  getTwoFactorStatus,
  login,
  resendTwoFactorCode,
  resetPassword,
  setupTwoFactor,
  signup,
  updateProfile,
  verifyResetCode,
  verifyTwoFactor,
} from './controllers/authController.js';
import {
  createSubmission,
  getSubmissionById,
  getUserSubmissions,
  getSubmissionTrackingUpdates,
  createSubmissionTrackingUpdate,
  updateSubmissionStatus,
} from './controllers/submissionController.js';
import {
  getConversations,
  getMessageContacts,
  getMessages,
  getUnreadMessageCount,
  markMessageAsRead,
  sendMessage,
  uploadMessageAttachment,
} from './controllers/messageController.js';
import {
  deleteNotificationById,
  getNotifications,
  getPreferences,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  updatePreferences,
} from './controllers/notificationController.js';
import {
  createTransaction,
  getTransactionsByPartner,
  getTransactionsBySubmission,
  getTransactionsByUser,
  updateTransactionStatus,
} from './controllers/transactionController.js';
import {
  createPartnerRuleChangeRequest,
  exportDssAuditReport,
  getDssAuditRuns,
  getPartnerDssRequests,
  getPartnerRuleChangeRequests,
  getSubmissionDss,
  getUserDssRequests,
  listPartners,
  remindDssRequest,
  replyToPartnerRuleChangeRequest,
  sendRecommendationToPartner,
  updateDssRequestStatus,
  updatePartnerRuleChangeRequestStatus,
} from './controllers/dssController.js';
import {
  createAdminUser,
  createDssRule,
  deleteAdminUser,
  deleteDssRule,
  getAdminSubmissions,
  getAdminUsers,
  getDeletedRecords,
  getDssRules,
  updateAdminSubmissionStatus,
  updateAdminUser,
  updateDssRule,
} from './controllers/adminController.js';
import { uploadFile } from './controllers/uploadController.js';
import { listPartnerLocations } from './services/gisService.js';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
  twoFactorDisableSchema,
  twoFactorEnableSchema,
  twoFactorResendSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  updateProfileSchema,
  verifyResetCodeSchema,
} from './schemas/auth.js';
import { createSubmissionSchema, createTrackingUpdateSchema, updateSubmissionStatusSchema } from './schemas/submissions.js';
import { sendMessageSchema } from './schemas/messages.js';
import { createTransactionSchema, updateTransactionStatusSchema } from './schemas/transactions.js';
import {
  partnerRuleChangeReplySchema,
  partnerRuleChangeRequestSchema,
  remindDssRequestSchema,
  sendDssRecommendationSchema,
  updateDssRequestStatusSchema,
} from './schemas/dss.js';
import {
  partnerIdParamSchema,
  submissionIdParamSchema,
  userIdParamSchema,
  uuidParamSchema,
} from './schemas/common.js';

type Variables = {
  user?: AuthUser;
};

type Bindings = EnvRecord;

type HandlerOptions = {
  auth?: boolean;
  bodySchema?: ZodSchema;
  paramsSchema?: ZodSchema;
  upload?: boolean;
  uploadPolicy?: 'image' | 'messageAttachment';
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_MIMETYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);
const MAX_MESSAGE_ATTACHMENT_SIZE = 50 * 1024 * 1024;
const ALLOWED_MESSAGE_ATTACHMENT_MIMETYPES = new Set([
  ...ALLOWED_UPLOAD_MIMETYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const ALLOWED_MESSAGE_ATTACHMENT_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.heic',
  '.heif',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

type CompatResponse = {
  response?: Response;
  statusCode: number;
  headers: Headers;
  status: (code: number) => CompatResponse;
  setHeader: (name: string, value: string) => CompatResponse;
  json: (body: unknown) => Response;
  send: (body: string | Buffer | Uint8Array | object) => Response;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
let localDatabaseStatus: 'starting' | 'connected' | 'error' = 'starting';

export function setLocalDatabaseStatus(status: 'starting' | 'connected' | 'error') {
  localDatabaseStatus = status;
}

app.use('*', secureHeaders({ crossOriginResourcePolicy: 'cross-origin' }));
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || isAllowedCorsOrigin(origin)) {
        return origin || config.cors.origins[0] || 'http://localhost:5173';
      }
      return config.cors.origins[0] || 'http://localhost:5173';
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.get('/api/health', (c) =>
  c.json({
    status: localDatabaseStatus === 'connected' ? 'ok' : 'degraded',
    message: 'ClothCycle Hono Backend is running',
    database: localDatabaseStatus,
    runtime: 'hono-node',
  }, localDatabaseStatus === 'connected' ? 200 : 503)
);

app.get('/uploads/:filename', async (c) => {
  const filename = path.basename(c.req.param('filename'));
  const filePath = path.resolve(process.cwd(), 'uploads', filename);

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        'Content-Type': contentTypeFromFilename(filename),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch {
    return c.json({ error: 'File not found' }, 404);
  }
});

app.get('/uploads/messages/:filename', async (c) => {
  const filename = path.basename(c.req.param('filename'));
  const filePath = path.resolve(process.cwd(), 'uploads', 'messages', filename);

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        'Content-Type': contentTypeFromFilename(filename),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      },
    });
  } catch {
    return c.json({ error: 'File not found' }, 404);
  }
});

// Auth
app.post('/api/auth/signup', controller(signup, { bodySchema: signupSchema }));
app.post('/api/auth/login', controller(login, { bodySchema: loginSchema }));
app.post('/api/auth/google', controller(continueWithGoogle, { bodySchema: googleAuthSchema }));
app.post('/api/auth/2fa/verify', controller(verifyTwoFactor, { bodySchema: twoFactorVerifySchema }));
app.post('/api/auth/2fa/resend', controller(resendTwoFactorCode, { bodySchema: twoFactorResendSchema }));
app.post('/api/auth/forgot-password', controller(forgotPassword, { bodySchema: forgotPasswordSchema }));
app.post('/api/auth/verify-reset-code', controller(verifyResetCode, { bodySchema: verifyResetCodeSchema }));
app.post('/api/auth/reset-password', controller(resetPassword, { bodySchema: resetPasswordSchema }));
app.get('/api/auth/profile', controller(getProfile, { auth: true }));
app.put('/api/auth/profile', controller(updateProfile, { auth: true, bodySchema: updateProfileSchema }));
app.put('/api/auth/password', controller(changePassword, { auth: true, bodySchema: changePasswordSchema }));
app.delete('/api/auth/account', controller(deleteOwnAccount, { auth: true }));
app.get('/api/auth/2fa/status', controller(getTwoFactorStatus, { auth: true }));
app.get('/api/auth/2fa/setup', controller(setupTwoFactor, { auth: true }));
app.post('/api/auth/2fa/setup', controller(setupTwoFactor, { auth: true, bodySchema: twoFactorSetupSchema }));
app.post('/api/auth/2fa/enable', controller(enableTwoFactor, { auth: true, bodySchema: twoFactorEnableSchema }));
app.post('/api/auth/2fa/disable', controller(disableTwoFactor, { auth: true, bodySchema: twoFactorDisableSchema }));

// Submissions
app.post('/api/submissions', controller(createSubmission, { auth: true, bodySchema: createSubmissionSchema }));
app.get('/api/submissions', controller(getUserSubmissions, { auth: true }));
app.get('/api/submissions/:id', controller(getSubmissionById, { auth: true, paramsSchema: uuidParamSchema }));
app.get('/api/submissions/:id/tracking', controller(getSubmissionTrackingUpdates, { auth: true, paramsSchema: uuidParamSchema }));
app.post('/api/submissions/:id/tracking', controller(createSubmissionTrackingUpdate, { auth: true, paramsSchema: uuidParamSchema, bodySchema: createTrackingUpdateSchema }));
app.put(
  '/api/submissions/:id/status',
  controller(updateSubmissionStatus, {
    auth: true,
    paramsSchema: uuidParamSchema,
    bodySchema: updateSubmissionStatusSchema,
  })
);

// Messages
app.get('/api/messages/contacts', controller(getMessageContacts, { auth: true }));
app.post('/api/messages/attachments', controller(uploadMessageAttachment, { auth: true, upload: true, uploadPolicy: 'messageAttachment' }));
app.post('/api/messages', controller(sendMessage, { auth: true, bodySchema: sendMessageSchema }));
app.get('/api/messages/conversations', controller(getConversations, { auth: true }));
app.get('/api/messages/unread-count', controller(getUnreadMessageCount, { auth: true }));
app.get('/api/messages/:userId', controller(getMessages, { auth: true, paramsSchema: userIdParamSchema }));
app.put('/api/messages/:id/read', controller(markMessageAsRead, { auth: true, paramsSchema: uuidParamSchema }));

// Notifications
app.get('/api/notifications', controller(getNotifications, { auth: true }));
app.get('/api/notifications/count', controller(getUnreadCount, { auth: true }));
app.get('/api/notifications/preferences', controller(getPreferences, { auth: true }));
app.put('/api/notifications/preferences', controller(updatePreferences, { auth: true }));
app.put('/api/notifications/read-all', controller(markAllAsRead, { auth: true }));
app.put('/api/notifications/:id/read', controller(markAsRead, { auth: true, paramsSchema: uuidParamSchema }));
app.delete('/api/notifications/:id', controller(deleteNotificationById, { auth: true, paramsSchema: uuidParamSchema }));

// Transactions
app.post('/api/transactions', controller(createTransaction, { auth: true, bodySchema: createTransactionSchema }));
app.get(
  '/api/transactions/submission/:submissionId',
  controller(getTransactionsBySubmission, { auth: true, paramsSchema: submissionIdParamSchema })
);
app.get('/api/transactions/user', controller(getTransactionsByUser, { auth: true }));
app.get(
  '/api/transactions/partner/:partnerId',
  controller(getTransactionsByPartner, { auth: true, paramsSchema: partnerIdParamSchema })
);
app.put(
  '/api/transactions/:id',
  controller(updateTransactionStatus, { auth: true, paramsSchema: uuidParamSchema, bodySchema: updateTransactionStatusSchema })
);

// Uploads
app.post('/api/upload', controller(uploadFile, { auth: true, upload: true }));

// DSS
app.get('/api/gis/partners', async (c) => {
  try {
    await getAuthenticatedUser(c);
    const partners = await listPartnerLocations(getPartnerSearchOptions(c));
    return c.json({ data: partners, count: partners.length });
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({ error: error.message }, error.statusCode as any);
    }
    throw error;
  }
});

app.get('/api/dss/partners', controller(listPartners, { auth: true }));
app.get('/api/dss/audit', controller(getDssAuditRuns, { auth: true }));
app.get('/api/dss/audit/export', controller(exportDssAuditReport, { auth: true }));
app.get('/api/dss/rule-change-requests', controller(getPartnerRuleChangeRequests, { auth: true }));
app.post(
  '/api/dss/rule-change-requests/:id/replies',
  controller(replyToPartnerRuleChangeRequest, { auth: true, paramsSchema: uuidParamSchema, bodySchema: partnerRuleChangeReplySchema })
);
app.put(
  '/api/dss/rule-change-requests/:id/status',
  controller(updatePartnerRuleChangeRequestStatus, { auth: true, paramsSchema: uuidParamSchema })
);
app.post(
  '/api/dss/rule-change-requests',
  controller(createPartnerRuleChangeRequest, { auth: true, bodySchema: partnerRuleChangeRequestSchema })
);
app.get(
  '/api/dss/submissions/:submissionId',
  controller(getSubmissionDss, { auth: true, paramsSchema: submissionIdParamSchema })
);
app.post('/api/dss/send', controller(sendRecommendationToPartner, { auth: true, bodySchema: sendDssRecommendationSchema }));
app.get('/api/dss/requests/user', controller(getUserDssRequests, { auth: true }));
app.get('/api/dss/requests/partner', controller(getPartnerDssRequests, { auth: true }));
app.post(
  '/api/dss/requests/:id/remind',
  controller(remindDssRequest, { auth: true, paramsSchema: uuidParamSchema, bodySchema: remindDssRequestSchema })
);
app.put(
  '/api/dss/requests/:id/status',
  controller(updateDssRequestStatus, { auth: true, paramsSchema: uuidParamSchema, bodySchema: updateDssRequestStatusSchema })
);

// Admin
app.get('/api/admin/users', controller(getAdminUsers, { auth: true }));
app.post('/api/admin/users', controller(createAdminUser, { auth: true }));
app.put('/api/admin/users/:id', controller(updateAdminUser, { auth: true, paramsSchema: uuidParamSchema }));
app.delete('/api/admin/users/:id', controller(deleteAdminUser, { auth: true, paramsSchema: uuidParamSchema }));
app.get('/api/admin/deleted-records', controller(getDeletedRecords, { auth: true }));
app.get('/api/admin/submissions', controller(getAdminSubmissions, { auth: true }));
app.put('/api/admin/submissions/:id/status', controller(updateAdminSubmissionStatus, { auth: true, paramsSchema: uuidParamSchema }));
app.get('/api/admin/dss-rules', controller(getDssRules, { auth: true }));
app.post('/api/admin/dss-rules', controller(createDssRule, { auth: true }));
app.put('/api/admin/dss-rules/:id', controller(updateDssRule, { auth: true, paramsSchema: uuidParamSchema }));
app.delete('/api/admin/dss-rules/:id', controller(deleteDssRule, { auth: true, paramsSchema: uuidParamSchema }));

app.onError((error, c) => {
  const status = error instanceof AppError ? error.statusCode : 500;
  return c.json(
    {
      error: error.message || 'Internal server error',
      stack: config.server.env === 'development' ? error.stack : undefined,
    },
    status as any
  );
});

app.all('*', (c) => c.json({ error: 'Route not found' }, 404));

function controller(handler: (req: any, res: any) => unknown, options: HandlerOptions = {}) {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>) => {
    try {
      const req = await buildCompatRequest(c, options);
      const res = createCompatResponse();
      await handler(req, res);
      return res.response ?? c.json({ error: 'No response returned' }, 500);
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          {
            error: 'Validation failed',
            details: error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
          400
        );
      }

      if (error instanceof AppError) {
        return c.json({ error: error.message }, error.statusCode as any);
      }

      throw error;
    }
  };
}

async function buildCompatRequest(c: Context<{ Bindings: Bindings; Variables: Variables }>, options: HandlerOptions) {
  const headers = Object.fromEntries(c.req.raw.headers.entries());
  const user = options.auth ? await getAuthenticatedUser(c) : undefined;
  const params = options.paramsSchema ? options.paramsSchema.parse(c.req.param()) : c.req.param();
  const query = Object.fromEntries(new URL(c.req.url).searchParams.entries());
  const body = options.upload ? {} : await readJsonBody(c);
  const parsedBody = options.bodySchema ? options.bodySchema.parse(body) : body;
  const file = options.upload ? await readUploadFile(c, options.uploadPolicy || 'image') : undefined;

  return {
    body: parsedBody,
    params,
    query,
    headers,
    ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1',
    method: c.req.method,
    protocol: new URL(c.req.url).protocol.replace(':', ''),
    user,
    file,
    config: getConfig(c.env),
    get(name: string) {
      return c.req.header(name);
    },
  };
}

function createCompatResponse(): CompatResponse {
  const res: CompatResponse = {
    statusCode: 200,
    headers: new Headers(),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers.set(name, value);
      return this;
    },
    json(body: unknown) {
      this.headers.set('Content-Type', 'application/json; charset=utf-8');
      this.response = new Response(JSON.stringify(body), {
        status: this.statusCode,
        headers: this.headers,
      });
      return this.response;
    },
    send(body: string | Buffer | Uint8Array | object) {
      const payload = typeof body === 'object' && !(body instanceof Uint8Array) ? JSON.stringify(body) : body;
      if (!this.headers.has('Content-Type')) {
        this.headers.set('Content-Type', typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/octet-stream');
      }
      this.response = new Response(payload as any, {
        status: this.statusCode,
        headers: this.headers,
      });
      return this.response;
    },
  };

  return res;
}

async function getAuthenticatedUser(c: Context<{ Bindings: Bindings; Variables: Variables }>) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    throw new AppError(401, 'Unauthorized');
  }

  try {
    const user = verifyToken(token, getConfig(c.env)) as AuthUser;
    const result = await query('SELECT status FROM users WHERE id = $1', [user.id]);

    if (result.rows.length === 0) {
      throw new AppError(401, 'Unauthorized');
    }

    if (String(result.rows[0].status || 'active').toLowerCase() === 'suspended') {
      throw new AppError(403, 'Your account has been suspended. Please contact support or the administrator.');
    }

    return user;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(401, 'Unauthorized');
  }
}

async function readJsonBody(c: Context) {
  if (['GET', 'HEAD'].includes(c.req.method)) {
    return {};
  }

  const contentType = c.req.header('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {};
  }

  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

async function readUploadFile(c: Context, policy: 'image' | 'messageAttachment' = 'image') {
  const formData = await c.req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return undefined;
  }

  const extension = path.extname(file.name).toLowerCase();
  const isMessageAttachment = policy === 'messageAttachment';
  const allowedMimetypes = isMessageAttachment
    ? ALLOWED_MESSAGE_ATTACHMENT_MIMETYPES
    : ALLOWED_UPLOAD_MIMETYPES;
  const maxSize = isMessageAttachment ? MAX_MESSAGE_ATTACHMENT_SIZE : MAX_UPLOAD_SIZE;
  const typeAllowed =
    allowedMimetypes.has(file.type) ||
    (isMessageAttachment && ALLOWED_MESSAGE_ATTACHMENT_EXTENSIONS.has(extension));

  if (!typeAllowed) {
    throw new AppError(
      400,
      isMessageAttachment
        ? 'Only images, PDF, Word, and Excel files are allowed'
        : 'Only image files are allowed'
    );
  }

  if (file.size > maxSize) {
    throw new AppError(
      400,
      isMessageAttachment
        ? 'Message attachments must be 50MB or smaller'
        : 'File size must be less than 5MB'
    );
  }

  return {
    fieldname: 'file',
    originalname: file.name,
    encoding: '7bit',
    mimetype: file.type || contentTypeFromFilename(file.name),
    size: file.size,
    buffer: Buffer.from(await file.arrayBuffer()),
  };
}

function isAllowedCorsOrigin(origin: string) {
  if (config.cors.origins.includes(origin)) {
    return true;
  }

  if (config.server.env === 'development') {
    return /^http:\/\/(localhost|127\.0\.0\.1):517\d$/.test(origin);
  }

  return false;
}

function contentTypeFromFilename(filename: string) {
  const extension = path.extname(filename).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.heic') return 'image/heic';
  if (extension === '.heif') return 'image/heif';
  if (extension === '.pdf') return 'application/pdf';
  if (extension === '.doc') return 'application/msword';
  if (extension === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (extension === '.xls') return 'application/vnd.ms-excel';
  if (extension === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'image/jpeg';
}

function getPartnerSearchOptions(c: Context) {
  return {
    latitude: parseOptionalNumber(c.req.query('lat')),
    longitude: parseOptionalNumber(c.req.query('lng')),
    pathway: c.req.query('pathway') || undefined,
    radiusKm: parseOptionalNumber(c.req.query('radius_km')),
  };
}

function parseOptionalNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default app;
