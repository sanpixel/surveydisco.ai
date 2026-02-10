const { formatTicket } = require('../utils/ticketFormatter');

describe('Ticket Formatter Unit Tests', () => {
  test('rendering with short content', () => {
    const ticket = {
      id: 'test-1',
      projectId: '1',
      content: 'Short',
      author: 'default_user',
      timestamp: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z'
    };

    const display = formatTicket(ticket);
    expect(display).toContain('default_user');
    expect(display).toContain('Short');
  });

  test('rendering with long content', () => {
    const ticket = {
      id: 'test-2',
      projectId: '1',
      content: 'This is a very long content that should be displayed properly without any issues',
      author: 'system',
      timestamp: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z'
    };

    const display = formatTicket(ticket);
    expect(display).toContain('system');
    expect(display).toContain('This is a very long content');
  });

  test('timestamp formatting', () => {
    const ticket = {
      id: 'test-3',
      projectId: '1',
      content: 'Test',
      author: 'admin',
      timestamp: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z'
    };

    const display = formatTicket(ticket);
    expect(display).toMatch(/\[.*\]/); // Contains timestamp in brackets
  });

  test('author display', () => {
    const ticket = {
      id: 'test-4',
      projectId: '1',
      content: 'Test content',
      author: 'custom_user',
      timestamp: '2024-01-15T10:30:00Z',
      createdAt: '2024-01-15T10:30:00Z'
    };

    const display = formatTicket(ticket);
    expect(display).toContain('custom_user:');
  });
});
