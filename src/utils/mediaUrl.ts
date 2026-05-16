const DEFAULT_API_URL = 'http://localhost:5000/api';

const apiUrl = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, '');
const apiBaseUrl = apiUrl.replace(/\/api$/, '');

export function resolveMediaUrl(value?: string | null): string {
  const rawValue = value?.trim();

  if (!rawValue) {
    return '';
  }

  if (/^(data:|blob:)/i.test(rawValue)) {
    return rawValue;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    return rewriteLocalUploadUrl(rawValue);
  }

  if (rawValue.startsWith('/api/uploads/')) {
    return `${apiBaseUrl}${rawValue}`;
  }

  if (rawValue.startsWith('/uploads/')) {
    return `${apiBaseUrl}${rawValue}`;
  }

  if (rawValue.startsWith('uploads/')) {
    return `${apiBaseUrl}/${rawValue}`;
  }

  if (rawValue.startsWith('local/')) {
    return `${apiBaseUrl}/uploads/${encodeURIComponent(rawValue.slice('local/'.length))}`;
  }

  return rawValue;
}

function rewriteLocalUploadUrl(rawValue: string): string {
  try {
    const mediaUrl = new URL(rawValue);

    if (
      mediaUrl.pathname.startsWith('/uploads/') &&
      ['localhost', '127.0.0.1'].includes(mediaUrl.hostname) &&
      typeof window !== 'undefined' &&
      !['localhost', '127.0.0.1'].includes(window.location.hostname)
    ) {
      return `${apiBaseUrl}${mediaUrl.pathname}`;
    }
  } catch {
    return rawValue;
  }

  return rawValue;
}
