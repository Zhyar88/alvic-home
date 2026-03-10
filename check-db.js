import pg from 'pg';

const { Client } = pg;

const connectionString = 'postgresql://neondb_owner:npg_LlJE1dFV8neX@ep-misty-leaf-agy9g62n-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full';

async function checkDatabase() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to Neon database\n');

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Existing tables:');
    result.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
