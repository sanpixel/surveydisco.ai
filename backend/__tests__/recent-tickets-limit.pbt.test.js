const fc = require('fast-check');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');
const TicketManager = require('../managers/TicketManager');

// Feature: project-ticketing-system, Property 4: Recent tickets limited to maximum count
// **Validates: Requirements 2.1, 2.3**

describe('Property 4: Recent tickets limited to maximum count', () => {
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
    `, ['PBTTEST03', 'PBT Test Client 3', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['PBTTEST03']);
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

  test('for any project with N tickets, requesting K recent tickets returns min(N, K)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 10 }), // N tickets
        fc.integer({ min: 1, max: 5 }),  // K requested
        async (numTickets, requestedCount) => {
          // Create N tickets
          for (let i = 0; i < numTickets; i++) {
            await manager.createTicket(testProjectId, `Ticket ${i}`);
          }

          // Request K recent tickets
          const recentTickets = await manager.getRecentTickets(testProjectId, requestedCount);

          // Verify count is min(N, K)
          const expectedCount = Math.min(numTickets, requestedCount);
          expect(recentTickets.length).toBe(expectedCount);

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
