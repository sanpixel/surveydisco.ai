import React, { useState } from 'react';
import './ProjectTable.css';

const ProjectTable = ({ projects, onUpdate }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (projectId, field, currentValue) => {
    setEditingCell({ projectId, field });
    setEditValue(currentValue || '');
  };

  const finishEdit = () => {
    if (editingCell) {
      onUpdate(editingCell.projectId, editingCell.field, editValue);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      finishEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderCell = (project, field, value) => {
    const isEditing = editingCell?.projectId === project.id && editingCell?.field === field;
    const isReadOnly = field === 'jobNumber' || field === 'created' || field === 'modified';

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={handleKeyDown}
          autoFocus
          className="edit-input"
        />
      );
    }

    return (
      <div
        className={`cell ${isReadOnly ? 'readonly' : 'editable'}`}
        onClick={() => !isReadOnly && startEdit(project.id, field, value)}
        title={isReadOnly ? 'Read-only field' : 'Click to edit'}
      >
        {field === 'created' || field === 'modified' ? formatDate(value) : (value || '')}
      </div>
    );
  };

  if (!projects.length) {
    return (
      <div className="table-container">
        <div className="empty-state">
          No projects yet. Add one using the text input above.
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="project-table">
        <thead>
          <tr>
            <th>Job #</th>
            <th>Client</th>
            <th>Address</th>
            <th>Parcel/APN</th>
            <th>Area</th>
            <th>Contact</th>
            <th>Service Type</th>
            <th>Status</th>
            <th>Created</th>
            <th>Modified</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td>{renderCell(project, 'jobNumber', project.jobNumber)}</td>
              <td>{renderCell(project, 'client', project.client)}</td>
              <td>{renderCell(project, 'address', project.address)}</td>
              <td>{renderCell(project, 'parcel', project.parcel)}</td>
              <td>{renderCell(project, 'area', project.area)}</td>
              <td>{renderCell(project, 'contact', project.contact)}</td>
              <td>{renderCell(project, 'serviceType', project.serviceType)}</td>
              <td>{renderCell(project, 'status', project.status)}</td>
              <td>{renderCell(project, 'created', project.created)}</td>
              <td>{renderCell(project, 'modified', project.modified)}</td>
              <td>{renderCell(project, 'notes', project.notes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTable;
