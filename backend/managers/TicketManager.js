const crypto = require('crypto');
const { validateContent } = require('../validation/ticketValidation');

/**
 * TicketManager - Business logic for ticket operations
 */
class TicketManager {
  constructor(storage) {
    this.storage = storage;
  }

  /**
   * Create a new ticket for a project
   * @param {string} projectId - Project ID
   * @param {string} content - Ticket content
   * @returns {Object} Result object with ticket or error
   */
  async createTicket(projectId, content) {
    // Validate content
    const validation = validateContent(content);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error
      };
    }

    // Generate ticket
    const ticket = {
      id: crypto.randomUUID(),
      projectId: projectId,
      content: content,
      author: 'default_user',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Persist ticket
    try {
      await this.storage.save(ticket);
      return {
        success: true,
        ticket: ticket
      };
    } catch (error) {
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * Get all tickets for a project, sorted by timestamp descending
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Sorted array of tickets
   */
  async getTickets(projectId) {
    const tickets = await this.storage.findByProject(projectId);
    return tickets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get the N most recent tickets for a project
   * @param {string} projectId - Project ID
   * @param {number} count - Number of tickets to return
   * @returns {Promise<Array>} Array of recent tickets
   */
  async getRecentTickets(projectId, count) {
    const allTickets = await this.getTickets(projectId);
    return allTickets.slice(0, count);
  }
}

module.exports = TicketManager;
