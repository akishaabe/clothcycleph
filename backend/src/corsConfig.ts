export const TRUSTED_CORS_ORIGINS = [
  'https://clothcycleph.com',
  'https://www.clothcycleph.com',
  'http://localhost:5173',
] as const;

const TRUSTED_CORS_ORIGIN_SET = new Set<string>(TRUSTED_CORS_ORIGINS);

export function getAllowedCorsOrigins(configuredOrigins?: string) {
  const configuredTrustedOrigins = (configuredOrigins || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => TRUSTED_CORS_ORIGIN_SET.has(origin));

  return configuredTrustedOrigins.length > 0
    ? configuredTrustedOrigins
    : [...TRUSTED_CORS_ORIGINS];
}

export function resolveAllowedCorsOrigin(origin: string, configuredOrigins?: string) {
  if (!origin) {
    return null;
  }

  const allowedOrigins = getAllowedCorsOrigins(configuredOrigins);
  return allowedOrigins.includes(origin) ? origin : null;
}
