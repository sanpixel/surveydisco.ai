const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

describe('Tickets Column Migration', () => {
  let pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  test('migration runs successfully and adds tickets column', async () => {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/001_create_tickets_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Run the migration
    await pool.query(migrationSQL);

    // Verify column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'surveydisco_projects'
      AND column_name = 'tickets'
    `);

    expect(columnCheck.rows.length).toBe(1);
    expect(columnCheck.rows[0].column_name).toBe('tickets');
    expect(columnCheck.rows[0].data_type).toBe('jsonb');
  });

  test('tickets column has correct default value', async () => {
    // Query column information
    const columnResult = await pool.query(`
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'surveydisco_projects'
      AND column_name = 'tickets'
    `);

    expect(columnResult.rows[0].column_default).toContain('[]');
  });

  test('GIN index is created on tickets column', async () => {
    // Query index information
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'surveydisco_projects'
      AND schemaname = 'public'
      AND indexname = 'idx_projects_tickets'
    `);

    expect(indexResult.rows.length).toBe(1);
    expect(indexResult.rows[0].indexdef).toContain('tickets');
    expect(indexResult.rows[0].indexdef).toContain('gin');
  });

  test('can insert and query tickets as JSONB array', async () => {
    // Insert a test project with tickets
    const testTickets = [
      {
        id: 'test-ticket-1',
        content: 'Test ticket content',
        author: 'default_user',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    const insertResult = await pool.query(`
      INSERT INTO surveydisco_projects (job_number, client, tickets)
      VALUES ($1, $2, $3)
      RETURNING id, tickets
    `, ['TEST001', 'Test Client', JSON.stringify(testTickets)]);

    expect(insertResult.rows[0].tickets).toEqual(testTickets);

    // Clean up test data
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['TEST001']);
  });
});
