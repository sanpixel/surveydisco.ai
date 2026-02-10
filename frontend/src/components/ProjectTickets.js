import React, { useState, useEffect } from 'react';
import './ProjectTickets.css';
import { useAdmin } from '../contexts/AdminContext';

const ProjectTickets = ({ projectId }) => {
  const [tickets, setTickets] = useState([]);
  const [newTicketContent, setNewTicketContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAdmin } = useAdmin();

  useEffect(() => {
    loadTickets();
  }, [projectId]);

  const loadTickets = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/tickets`);
      if (response.ok) {
        const data = await response.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTicketContent.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTicketContent })
      });

      if (response.ok) {
        const ticket = await response.json();
        setTickets([ticket, ...tickets]);
        setNewTicketContent('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create ticket');
      }
    } catch (err) {
      setError('Failed to create ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (ticketId) => {
    setTickets(tickets.filter(t => t.id !== ticketId));
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="project-tickets">
      <div className="tickets-header">Project Updates</div>
      
      <form onSubmit={handleSubmit} className="ticket-form">
        <textarea
          value={newTicketContent}
          onChange={(e) => setNewTicketContent(e.target.value)}
          placeholder="Add a new update..."
          className="ticket-input"
          rows="2"
          maxLength="1000"
          disabled={loading}
        />
        <button type="submit" className="ticket-submit" disabled={loading || !newTicketContent.trim()}>
          {loading ? 'Adding...' : 'Add Update'}
        </button>
      </form>

      {error && <div className="ticket-error">{error}</div>}

      <div className="tickets-list">
        {tickets.length === 0 ? (
          <div className="tickets-empty">No updates yet. Add one above!</div>
        ) : (
          tickets.map((ticket) => (
            <div key={ticket.id} className="ticket-item">
              {isAdmin && (
                <button 
                  className="ticket-remove"
                  onClick={() => handleRemove(ticket.id)}
                  title="Remove ticket"
                >
                  ×
                </button>
              )}
              <div className="ticket-meta">
                <span className="ticket-author">{ticket.author}</span>
                <span className="ticket-timestamp">{formatTimestamp(ticket.timestamp)}</span>
              </div>
              <div className="ticket-content">{ticket.content}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectTickets;
