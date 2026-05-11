import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getMigrationsDirectory() {
  const distDirectory = path.join(__dirname, 'migrations');
  const sourceDirectory = path.resolve(__dirname, '..', '..', 'src', 'db', 'migrations');

  return fs.existsSync(distDirectory) ? distDirectory : sourceDirectory;
}

export async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);

  const migrationsDirectory = getMigrationsDirectory();
  const migrationFiles = fs
    .readdirSync(migrationsDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const migrationFile of migrationFiles) {
    const existing = await query('SELECT id FROM schema_migrations WHERE name = $1', [
      migrationFile,
    ]);

    if (existing.rows.length > 0) {
      continue;
    }

    const migrationSql = fs.readFileSync(path.join(migrationsDirectory, migrationFile), 'utf8');

    await query('BEGIN');
    try {
      await query(migrationSql);
      await query('INSERT INTO schema_migrations (name) VALUES ($1)', [migrationFile]);
      await query('COMMIT');
      console.log(`Applied migration: ${migrationFile}`);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  }
}
