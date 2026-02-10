const fc = require('fast-check');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');
const TicketManager = require('../managers/TicketManager');

// Feature: project-ticketing-system, Property 6: Tickets ordered chronologically descending
// **Validates: Requirements 2.5, 5.4, 6.3**

describe('Property 6: Tickets ordered chronologically descending', () => {
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
    `, ['PBTTEST04', 'PBT Test Client 4', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['PBTTEST04']);
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

  test('for any list of tickets, they are ordered by timestamp descending (newest first)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 8 }),
        async (numTickets) => {
          // Create tickets with small delays to ensure different timestamps
          const createdTickets = [];
          for (let i = 0; i < numTickets; i++) {
            const result = await manager.createTicket(testProjectId, `Ticket ${i}`);
            createdTickets.push(result.ticket);
            // Small delay to ensure different timestamps
            await new Promise(resolve => setTimeout(resolve, 10));
          }

          // Get tickets
          const retrievedTickets = await manager.getTickets(testProjectId);

          // Verify they are in descending order
          for (let i = 0; i < retrievedTickets.length - 1; i++) {
            const current = new Date(retrievedTickets[i].timestamp);
            const next = new Date(retrievedTickets[i + 1].timestamp);
            expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
          }

          // Clean up
          await pool.query(`
            UPDATE surveydisco_projects
            SET tickets = '[]'::jsonb
            WHERE id = $1
          `, [testProjectId]);
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);
});
