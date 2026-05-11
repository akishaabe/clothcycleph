import { runMigrations } from '../db/migrate.js';

export async function initializeDatabase() {
  try {
    await runMigrations();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}
