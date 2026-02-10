/**
 * Format a ticket for display
 * @param {Object} ticket - Ticket object
 * @returns {string} Formatted ticket string
 */
function formatTicket(ticket) {
  const timestamp = new Date(ticket.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `[${timestamp}] ${ticket.author}: ${ticket.content}`;
}

module.exports = { formatTicket };
