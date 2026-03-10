import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full';

async function resetAndMigrate() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to Neon database\n');

    console.log('Dropping existing tables...');
    await client.query(`
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS customer_documents CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS exchange_rates CASCADE;
      DROP TABLE IF EXISTS expenses CASCADE;
      DROP TABLE IF EXISTS installment_schedules CASCADE;
      DROP TABLE IF EXISTS installments CASCADE;
      DROP TABLE IF EXISTS installment_entries CASCADE;
      DROP TABLE IF EXISTS lock_session_transactions CASCADE;
      DROP TABLE IF EXISTS lock_transactions CASCADE;
      DROP TABLE IF EXISTS lock_sessions CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS user_profiles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS auth_users CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
    `);
    console.log('✓ Dropped all existing tables\n');

    const sql = fs.readFileSync('neon-migrations.sql', 'utf8');

    console.log('Running complete database migration...');
    await client.query(sql);

    console.log('\n✓ All tables created successfully!');
    console.log('\n=== Database Setup Complete ===');
    console.log('\nTables created:');
    console.log('  - auth_users');
    console.log('  - user_profiles');
    console.log('  - exchange_rates');
    console.log('  - customers');
    console.log('  - customer_documents');
    console.log('  - orders');
    console.log('  - order_items');
    console.log('  - payments');
    console.log('  - installment_schedules');
    console.log('  - installment_entries');
    console.log('  - expenses');
    console.log('  - lock_sessions');
    console.log('  - lock_transactions');
    console.log('  - audit_logs');
    console.log('\nDefault Admin Credentials:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('  Email: admin@alvichome.com');

  } catch (error) {
    console.error('\n✗ Migration error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetAndMigrate();
