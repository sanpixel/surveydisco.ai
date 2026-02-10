const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');
const TicketManager = require('../managers/TicketManager');

describe('TicketManager Unit Tests', () => {
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
    `, ['TMTEST01', 'TM Test Client', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['TMTEST01']);
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

  test('createTicket with valid input', async () => {
    const result = await manager.createTicket(testProjectId, 'Valid ticket content');
    
    expect(result.success).toBe(true);
    expect(result.ticket).toBeDefined();
    expect(result.ticket.content).toBe('Valid ticket content');
    expect(result.ticket.author).toBe('default_user');
  });

  test('createTicket with invalid input returns error', async () => {
    const result = await manager.createTicket(testProjectId, '   ');
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('getRecentTickets with empty list', async () => {
    const recent = await manager.getRecentTickets(testProjectId, 3);
    expect(recent).toEqual([]);
  });

  test('getRecentTickets with exactly 3 tickets', async () => {
    await manager.createTicket(testProjectId, 'Ticket 1');
    await manager.createTicket(testProjectId, 'Ticket 2');
    await manager.createTicket(testProjectId, 'Ticket 3');

    const recent = await manager.getRecentTickets(testProjectId, 3);
    expect(recent.length).toBe(3);
  });

  test('getRecentTickets with more than 3 tickets', async () => {
    await manager.createTicket(testProjectId, 'Ticket 1');
    await manager.createTicket(testProjectId, 'Ticket 2');
    await manager.createTicket(testProjectId, 'Ticket 3');
    await manager.createTicket(testProjectId, 'Ticket 4');
    await manager.createTicket(testProjectId, 'Ticket 5');

    const recent = await manager.getRecentTickets(testProjectId, 3);
    expect(recent.length).toBe(3);
  });
});
