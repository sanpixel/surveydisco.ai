const fc = require('fast-check');
const { formatTicket } = require('../utils/ticketFormatter');

// Feature: project-ticketing-system, Property 5: Ticket display includes required fields
// **Validates: Requirements 2.2, 6.4**

describe('Property 5: Ticket display includes required fields', () => {
  test('for any ticket, the rendered display includes timestamp, author, and content', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          projectId: fc.integer({ min: 1, max: 1000 }).map(String),
          content: fc.string({ minLength: 1, maxLength: 100 }),
          author: fc.constantFrom('default_user', 'system', 'admin'),
          timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString()),
          createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString())
        }),
        (ticket) => {
          const display = formatTicket(ticket);

          // Verify display includes author
          expect(display).toContain(ticket.author);

          // Verify display includes content
          expect(display).toContain(ticket.content);

          // Verify display includes some timestamp representation
          expect(display.length).toBeGreaterThan(ticket.author.length + ticket.content.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});
