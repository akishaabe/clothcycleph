import pool from '../config/database.js';
import { runMigrations } from './migrate.js';

async function main() {
  try {
    await runMigrations();
    console.log('Migrations complete');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
