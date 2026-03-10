import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to Neon database\n');

    const sql = fs.readFileSync('neon-migrations.sql', 'utf8');

    console.log('Running complete database migration...\n');
    await client.query(sql);

    console.log('✓ All tables created successfully!');
    console.log('\n=== Database Setup Complete ===');
    console.log('\nDefault Admin Credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Email: admin@alvichome.com');

  } catch (error) {
    console.error('✗ Migration error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
