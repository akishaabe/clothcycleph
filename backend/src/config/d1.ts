/**
 * D1 (SQLite) Database Client for Cloudflare Workers
 * Provides a unified interface for database operations in the worker environment
 */

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = any>(column?: string): Promise<T | undefined>;
  all<T = any>(): Promise<D1Result<T>>;
  run(): Promise<D1Result<any>>;
}

export interface D1Result<T = any> {
  success: boolean;
  results?: T[];
  meta?: {
    duration: number;
    last_row_id?: number;
    changes?: number;
    served_by?: string;
    internal_stats?: string;
  };
}

export interface D1QueryOptions {
  method?: 'first' | 'all' | 'run';
}

/**
 * Wraps D1 prepared statements to provide a consistent query interface
 */
export async function queryD1<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<D1Result<T>> {
  const statement = bindParams(db.prepare(sql), params);

  const result = await statement.all<T>();
  return normalizeD1Result(result);
}

/**
 * Execute a query and return the first row
 */
export async function queryD1First<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<T | undefined> {
  const statement = bindParams(db.prepare(sql), params);

  const row = await statement.first<T>();
  return normalizeD1Row(row);
}

/**
 * Execute a mutation and return the result
 */
export async function executeD1<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<D1Result<T>> {
  const statement = bindParams(db.prepare(sql), params);

  if (/\bRETURNING\b/i.test(sql)) {
    const result = await statement.all<T>();
    return normalizeD1Result(result);
  }

  return statement.run();
}

function bindParams(statement: D1PreparedStatement, params: any[]) {
  return params.length > 0 ? statement.bind(...params) : statement;
}

const timestampFieldPattern = /(?:^|_)(?:created_at|updated_at|submitted_at|scheduled_at|expires_at|locked_until|last_message_time|email_verified_at|read_at)$/;
const sqliteUtcTimestampPattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/;

function normalizeD1Result<T>(result: D1Result<T>): D1Result<T> {
  if (!result.results) {
    return result;
  }

  return {
    ...result,
    results: result.results.map((row) => normalizeD1Row(row) as T),
  };
}

function normalizeD1Row<T>(row: T | undefined): T | undefined {
  if (!row || typeof row !== 'object') {
    return row;
  }

  const normalized: Record<string, unknown> = { ...(row as Record<string, unknown>) };

  for (const [key, value] of Object.entries(normalized)) {
    if (typeof value === 'string' && timestampFieldPattern.test(key) && sqliteUtcTimestampPattern.test(value)) {
      normalized[key] = `${value.replace(' ', 'T')}Z`;
    }
  }

  return normalized as T;
}

/**
 * Generate a UUID-like identifier using hex encoding of random bytes
 * SQLite doesn't have a built-in UUID function like PostgreSQL
 */
export function generateD1UUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  
  // Format as UUID string (8-4-4-4-12)
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}
