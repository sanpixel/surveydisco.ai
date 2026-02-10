const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const TicketStorage = require('../storage/TicketStorage');

describe('TicketStorage Unit Tests', () => {
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
    `, ['UNITTEST01', 'Unit Test Client', '[]']);
    testProjectId = result.rows[0].id;
  });

  afterAll(async () => {
    // Clean up test project
    await pool.query('DELETE FROM surveydisco_projects WHERE job_number = $1', ['UNITTEST01']);
    await pool.end();
  });

  beforeEach(async () => {
    // Reset tickets array before each test
    await pool.query(`
      UPDATE surveydisco_projects
      SET tickets = '[]'::jsonb
      WHERE id = $1
    `, [testProjectId]);
  });

  test('save operation with valid ticket', async () => {
    const ticket = {
      id: 'test-id-1',
      projectId: testProjectId,
      content: 'Test ticket content',
      author: 'default_user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await storage.save(ticket);

    const tickets = await storage.findByProject(testProjectId);
    expect(tickets).toHaveLength(1);
    expect(tickets[0].content).toBe('Test ticket content');
  });

  test('findByProject returns correct tickets', async () => {
    const ticket1 = {
      id: 'test-id-1',
      projectId: testProjectId,
      content: 'First ticket',
      author: 'default_user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const ticket2 = {
      id: 'test-id-2',
      projectId: testProjectId,
      content: 'Second ticket',
      author: 'default_user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await storage.save(ticket1);
    await storage.save(ticket2);

    const tickets = await storage.findByProject(testProjectId);
    expect(tickets).toHaveLength(2);
    expect(tickets[0].content).toBe('First ticket');
    expect(tickets[1].content).toBe('Second ticket');
  });

  test('findAll retrieves all tickets', async () => {
    const ticket = {
      id: 'test-id-1',
      projectId: testProjectId,
      content: 'Test ticket',
      author: 'default_user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await storage.save(ticket);

    const allTickets = await storage.findAll();
    expect(allTickets.length).toBeGreaterThanOrEqual(1);
    
    const found = allTickets.find(t => t.id === 'test-id-1');
    expect(found).toBeDefined();
    expect(found.content).toBe('Test ticket');
  });

  test('findByProject returns empty array for project with no tickets', async () => {
    const tickets = await storage.findByProject(testProjectId);
    expect(tickets).toEqual([]);
  });

  test('findByProject returns empty array for non-existent project', async () => {
    const tickets = await storage.findByProject(999999);
    expect(tickets).toEqual([]);
  });
});
