import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require';

async function runMigrations() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Neon database');

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`\nRunning migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        try {
          await client.query(sql);
          console.log(`✓ ${file} completed successfully`);
        } catch (error) {
          console.error(`✗ Error in ${file}:`, error.message);
          // Continue with other migrations even if one fails
        }
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log('All migrations processed.');

  } catch (error) {
    console.error('Connection error:', error);
  } finally {
    await client.end();
  }
}

runMigrations();
