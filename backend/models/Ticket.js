/**
 * Ticket data model
 * Represents a timestamped update/note for a project
 * 
 * @typedef {Object} Ticket
 * @property {string} id - Unique identifier (UUID)
 * @property {string} projectId - Associated project ID
 * @property {string} content - Ticket text content
 * @property {string} author - User identifier
 * @property {string} timestamp - ISO 8601 timestamp
 * @property {string} createdAt - ISO 8601 creation timestamp
 */

/**
 * @typedef {Object} TicketStorageOperations
 * @property {function(Ticket): Promise<void>} save - Save a ticket
 * @property {function(string): Promise<Ticket[]>} findByProject - Find tickets by project ID
 * @property {function(): Promise<Ticket[]>} findAll - Find all tickets
 */

module.exports = {};
