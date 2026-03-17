import '../env.js';
import pg from 'pg';

const { Pool } = pg;

// Env should be loaded by env.ts before this module is imported
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables!');
  console.error('Please create a .env file in the server directory with DATABASE_URL');
  process.exit(1);
}

console.log('🔌 Database connection: Configured ✓');
console.log('📍 Database host:', process.env.DATABASE_URL.match(/@(.+?)\//)?.[1] || 'unknown');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: {
  //   rejectUnauthorized: false,
  // },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

export async function getClient() {
  const client = await pool.connect();
  return client;
}
