const fc = require('fast-check');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');
const TicketManager = require('../managers/TicketManager');

// Feature: project-ticketing-system, Property 8: Display all tickets for project
// **Validates: Requirements 6.1**

describe('Property 8: Display all tickets for project', () => {
  let pool;
  let storage;
  let manager;
  let testProjectId;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    storage = new TicketStorage(pool);
    manager = new TicketManager(storage);

    // Create a test project
    const result = await pool.query(`
      INSERT INTO surveydisco_projects (job_number, client, tickets)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['PBTTEST05', 'PBT Test Client 5', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['PBTTEST05']);
    await pool.end();
  });

  beforeEach(async () => {
    // Reset tickets before each test
    await pool.query(`
      UPDATE surveydisco_projects
      SET tickets = '[]'::jsonb
      WHERE id = $1
    `, [testProjectId]);
  });

  test('for any project with N tickets, requesting all tickets returns exactly N tickets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }),
        async (numTickets) => {
          // Create N tickets
          for (let i = 0; i < numTickets; i++) {
            await manager.createTicket(testProjectId, `Ticket ${i}`);
          }

          // Get all tickets
          const allTickets = await manager.getTickets(testProjectId);

          // Verify count is exactly N
          expect(allTickets.length).toBe(numTickets);

          // Clean up
          await pool.query(`
            UPDATE surveydisco_projects
            SET tickets = '[]'::jsonb
            WHERE id = $1
          `, [testProjectId]);
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);
});
