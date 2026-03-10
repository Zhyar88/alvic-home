import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full';

async function verifyDatabase() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Connected to Neon database\n');

    // Check admin user
    const userResult = await client.query(`
      SELECT au.username, au.email, up.full_name_en, up.role
      FROM auth_users au
      JOIN user_profiles up ON au.id = up.user_id
      WHERE au.username = 'admin'
    `);

    if (userResult.rows.length > 0) {
      console.log('✓ Admin user verified:');
      const admin = userResult.rows[0];
      console.log(`  Username: ${admin.username}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Name: ${admin.full_name_en}`);
      console.log(`  Role: ${admin.role}\n`);
    }

    // Check all tables
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`✓ Total tables: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));

    console.log('\n✓ Database is ready to use!');

  } catch (error) {
    console.error('✗ Verification error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyDatabase();
