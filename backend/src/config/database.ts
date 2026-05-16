import pg, { PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pgTypes = (pg as any).types;

// Neon stores legacy TIMESTAMP columns as UTC values. node-postgres parses
// TIMESTAMP WITHOUT TIME ZONE as local machine time by default, which shifts
// displayed times by the server timezone. Treat those values as UTC instead.
const POSTGRES_TIMESTAMP_OID = 1114;
pgTypes.setTypeParser(POSTGRES_TIMESTAMP_OID, (value: string) => new Date(`${value.replace(' ', 'T')}Z`));

const databaseUrl = process.env.DATABASE_URL;
const requiresSsl =
  process.env.NODE_ENV === 'production' || databaseUrl?.includes('sslmode=require');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('Database query error', { text, error });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

export default pool;
