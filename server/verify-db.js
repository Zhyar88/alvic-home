import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function verify() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  });

  try {
    const client = await pool.connect();

    console.log('Checking admin user...');
    const userResult = await client.query(
      "SELECT id, email, full_name, role, is_active FROM users WHERE email = 'admin@cashregister.com'"
    );

    if (userResult.rows.length > 0) {
      console.log('✅ Admin user found:');
      console.log('   Email:', userResult.rows[0].email);
      console.log('   Name:', userResult.rows[0].full_name);
      console.log('   Role:', userResult.rows[0].role);
      console.log('   Active:', userResult.rows[0].is_active);
      console.log('\n   Login credentials:');
      console.log('   Email: admin@cashregister.com');
      console.log('   Password: Admin@123');
    } else {
      console.log('❌ Admin user not found');
    }

    console.log('\nChecking table counts...');
    const tables = [
      'users',
      'customers',
      'orders',
      'payments',
      'installments',
      'expenses',
      'exchange_rates',
      'lock_sessions'
    ];

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`  ${table}: ${result.rows[0].count} records`);
    }

    client.release();
    await pool.end();

    console.log('\n✅ Database verification complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verify();
