const fc = require('fast-check');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');
const TicketManager = require('../managers/TicketManager');

// Feature: project-ticketing-system, Property 2: Ticket added to project list
// **Validates: Requirements 1.4**

describe('Property 2: Ticket added to project list', () => {
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
    `, ['PBTTEST02', 'PBT Test Client 2', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['PBTTEST02']);
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

  test('for any project and valid content, creating a ticket adds it to project list', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
        async (content) => {
          // Get initial ticket count
          const initialTickets = await manager.getTickets(testProjectId);
          const initialCount = initialTickets.length;

          // Create ticket
          const result = await manager.createTicket(testProjectId, content);

          // Verify success
          expect(result.success).toBe(true);
          expect(result.ticket).toBeDefined();

          // Get updated ticket list
          const updatedTickets = await manager.getTickets(testProjectId);

          // Verify ticket was added
          expect(updatedTickets.length).toBe(initialCount + 1);
          
          // Verify the new ticket is in the list
          const found = updatedTickets.find(t => t.id === result.ticket.id);
          expect(found).toBeDefined();
          expect(found.content).toBe(content);

          // Clean up for next iteration
          await pool.query(`
            UPDATE surveydisco_projects
            SET tickets = '[]'::jsonb
            WHERE id = $1
          `, [testProjectId]);
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);
});
