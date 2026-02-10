const fc = require('fast-check');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');

// Feature: project-ticketing-system, Property 3: Ticket persistence round-trip
// **Validates: Requirements 1.5, 5.1, 5.3**

describe('Property 3: Ticket persistence round-trip', () => {
  let pool;
  let storage;
  let testProjectId;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    storage = new TicketStorage(pool);

    // Create a test project
    const result = await pool.query(`
      INSERT INTO surveydisco_projects (job_number, client, tickets)
      VALUES ($1, $2, $3)
      RETURNING id
    `, ['PBTTEST01', 'PBT Test Client', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test project
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['PBTTEST01']);
    await pool.end();
  });

  test('for any valid ticket, persisting and retrieving returns same content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
          author: fc.constantFrom('default_user', 'system', 'admin'),
          timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString())
        }),
        async (ticketData) => {
          const ticket = {
            ...ticketData,
            projectId: testProjectId
          };

          // Save the ticket
          await storage.save(ticket);

          // Retrieve tickets for the project
          const retrieved = await storage.findByProject(testProjectId);

          // Find the ticket we just saved
          const found = retrieved.find(t => t.id === ticket.id);

          // Verify the ticket exists and has same content
          expect(found).toBeDefined();
          expect(found.content).toBe(ticket.content);
          expect(found.author).toBe(ticket.author);
          expect(found.projectId).toBe(ticket.projectId);

          // Verify timestamps are within reasonable window (same value)
          expect(found.timestamp).toBe(ticket.timestamp);
          expect(found.createdAt).toBe(ticket.createdAt);

          // Clean up - reset tickets array for next iteration
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
