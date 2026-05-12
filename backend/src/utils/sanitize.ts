/**
 * Input sanitization utility to prevent XSS, SQL injection, and other attacks
 */

export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';

  return (
    input
      .replace(/[<>]/g, '') // Remove HTML brackets
      .replace(/"/g, '&quot;') // Escape quotes
      .replace(/'/g, '&#39;') // Escape single quotes
      .trim()
  );
}

export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = (value as unknown[]).map((item) => {
        if (typeof item === 'string') return sanitizeString(item);
        if (typeof item === 'object' && item !== null) return sanitizeObject(item as Record<string, unknown>);
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize phone number
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '';

  // Remove all non-digit characters except + at the start
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Basic validation: should have at least 7 digits and max 15 (E.164 standard)
  const digits = sanitized.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return '';
  }

  return sanitized;
}

/**
 * Validate file name to prevent directory traversal
 */
export function sanitizeFileName(fileName: string | null | undefined): string {
  if (!fileName) return '';

  return (
    fileName
      .replace(/\.\./g, '') // Remove ..
      .replace(/[\/\\]/g, '') // Remove path separators
      .replace(/[<>:"|?*]/g, '') // Remove invalid characters
      .trim()
  );
}
