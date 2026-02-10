const { Pool } = require('pg');

/**
 * TicketStorage - Handles persistence of tickets in surveydisco_projects.tickets JSONB column
 */
class TicketStorage {
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Save a ticket to the database
   * Appends the ticket to the project's tickets array
   * @param {Object} ticket - Ticket object to save
   * @returns {Promise<void>}
   */
  async save(ticket) {
    await this.pool.query(`
      UPDATE surveydisco_projects
      SET tickets = tickets || $1::jsonb,
          modified = NOW()
      WHERE id = $2
    `, [JSON.stringify([ticket]), ticket.projectId]);
  }

  /**
   * Find all tickets for a specific project
   * @param {string} projectId - Project ID
   * @returns {Promise<Array>} Array of ticket objects
   */
  async findByProject(projectId) {
    const result = await this.pool.query(`
      SELECT tickets
      FROM surveydisco_projects
      WHERE id = $1
    `, [projectId]);

    if (result.rows.length === 0) {
      return [];
    }

    return result.rows[0].tickets || [];
  }

  /**
   * Find all tickets across all projects
   * @returns {Promise<Array>} Array of ticket objects
   */
  async findAll() {
    const result = await this.pool.query(`
      SELECT tickets
      FROM surveydisco_projects
      WHERE tickets IS NOT NULL AND jsonb_array_length(tickets) > 0
    `);

    const allTickets = [];
    for (const row of result.rows) {
      if (row.tickets) {
        allTickets.push(...row.tickets);
      }
    }

    return allTickets;
  }
}

module.exports = TicketStorage;
