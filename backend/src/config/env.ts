import dotenv from 'dotenv';

dotenv.config();

export type EnvRecord = Record<string, unknown>;

export type AppConfig = ReturnType<typeof getConfig>;

const processEnv = (): EnvRecord =>
  typeof process !== 'undefined' && process.env ? process.env : {};

export function getConfig(env: EnvRecord = {}) {
  const read = (key: string, fallback?: string) => {
    const value = env[key] ?? processEnv()[key];
    return value == null ? fallback : String(value);
  };
  const nodeEnv = read('NODE_ENV', 'development');
  const corsOrigins = read('CORS_ORIGIN', 'https://clothcycleph.com,https://www.clothcycleph.com,http://localhost:5173')!
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const resolvedConfig = {
    server: {
      port: parseInt(read('PORT', '5000')!, 10),
      env: nodeEnv!,
    },
    database: {
      url: read('DATABASE_URL'),
    },
    redis: {
      url: read('REDIS_URL', 'redis://localhost:6379')!,
    },
    jwt: {
      secret: read('JWT_SECRET'),
      expiresIn: '7d',
    },
    cors: {
      origins: corsOrigins,
    },
    r2: {
      accountId: read('R2_ACCOUNT_ID'),
      accessKeyId: read('R2_ACCESS_KEY_ID'),
      secretAccessKey: read('R2_SECRET_ACCESS_KEY'),
      bucketName: read('R2_BUCKET_NAME'),
    },
    email: {
      provider: read('EMAIL_PROVIDER', 'console')!,
      resendApiKey: read('RESEND_API_KEY'),
      brevoApiKey: read('BREVO_API_KEY'),
      sendgridApiKey: read('SENDGRID_API_KEY'),
      from: read('EMAIL_FROM', 'ClothCycle PH <onboarding@resend.dev>')!,
    },
    google: {
      clientId: read('GOOGLE_CLIENT_ID'),
    },
    security: {
      twoFactorEncryptionKey: read('TWO_FACTOR_ENCRYPTION_KEY'),
    },
  };

  const requiredEnv = ['JWT_SECRET', 'TWO_FACTOR_ENCRYPTION_KEY'];
  if (!env.DB) {
    requiredEnv.unshift('DATABASE_URL');
  }
  const missingRequiredEnv = requiredEnv.filter((key) => !read(key));

  if (missingRequiredEnv.length > 0) {
    const message = `Missing required backend environment variables: ${missingRequiredEnv.join(', ')}`;
    if (resolvedConfig.server.env === 'production') {
      throw new Error(message);
    }
    console.warn(message);
  }

  return resolvedConfig;
}

export const config = getConfig();
