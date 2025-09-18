import React, { useState } from 'react';
import './ProjectCards.css';
import { openOneDriveFolder } from '../services/onedriveService';

const ProjectCards = ({ projects, onUpdate, onDelete }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [password, setPassword] = useState('');

  const startEdit = (projectId, field, currentValue) => {
    console.log('startEdit called:', { projectId, field, currentValue });
    setEditingCell({ projectId, field });
    setEditValue(currentValue || '');
    console.log('editingCell set to:', { projectId, field });
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

  const handleDeleteClick = (projectId) => {
    setShowDeletePrompt(projectId);
    setPassword('');
  };

  const confirmDelete = async () => {
    if (password && showDeletePrompt) {
      await onDelete(showDeletePrompt, password);
      setShowDeletePrompt(null);
      setPassword('');
    }
  };

  const cancelDelete = () => {
    setShowDeletePrompt(null);
    setPassword('');
  };

  const openInGoogleMaps = (address) => {
    if (address) {
      const encodedAddress = encodeURIComponent(address);
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank');
    }
  };

  const openInRegrid = (address, parcel, geoAddress) => {
    // Copy geoAddress to clipboard if available
    const addressToCopy = geoAddress || address;
    if (addressToCopy) {
      navigator.clipboard.writeText(addressToCopy).then(() => {
        console.log('Address copied to clipboard:', addressToCopy);
      }).catch(err => {
        console.log('Failed to copy address:', err);
      });
    }
    
    // Open hardcoded Georgia Tech Regrid URL
    window.open('https://app.regrid.com/us/ga#t=property&p=/us/ga/fulton/atlanta/367416', '_blank');
  };

  const handleOneDriveClick = async (project) => {
    await openOneDriveFolder(project);
  };

  const refreshTravelInfo = async (project) => {
    if (!project.address && !project.geoAddress) return;
    
    try {
      const response = await fetch(`/api/projects/${project.id}/refresh-travel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const updatedProject = await response.json();
        // Update the project in parent component
        onUpdate(project.id, 'travelTime', updatedProject.travelTime);
        onUpdate(project.id, 'travelDistance', updatedProject.travelDistance);
      }
    } catch (error) {
      console.error('Failed to refresh travel info:', error);
    }
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

  const renderField = (project, field, value, label, isReadOnly = false) => {
    const isEditing = editingCell?.projectId === project.id && editingCell?.field === field;

    if (isEditing) {
      return (
        <div className="field">
          <label className="field-label">{label}:</label>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={handleKeyDown}
            autoFocus
            className="edit-input-card"
          />
        </div>
      );
    }

    return (
      <div className="field">
        <label className="field-label">{label}:</label>
        <span
          className={`field-value ${isReadOnly ? 'readonly' : 'editable'}`}
          onClick={() => !isReadOnly && startEdit(project.id, field, value)}
          title={isReadOnly ? 'Read-only field' : 'Click to edit'}
        >
          {field === 'created' || field === 'modified' ? formatDate(value) : (value || '-')}
        </span>
      </div>
    );
  };

  if (!projects.length) {
    return (
      <div className="cards-container">
        <div className="empty-state">
          No projects yet. Add one using the text input above.
        </div>
      </div>
    );
  }

  return (
    <div className="cards-container">
      <div className="cards-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card">
            <div className="card-header">
              <div className="job-number">#{project.jobNumber}</div>
              <div className="travel-info" 
                   onClick={() => refreshTravelInfo(project)}
                   title="Click to refresh travel time with current traffic">
                {project.travelTime && <span className="travel-time">🕒 {project.travelTime}</span>}
                {project.travelDistance && <span className="travel-distance">📏 {project.travelDistance}</span>}
              </div>
              <div className="status-badge">{project.status}</div>
              {editingCell?.projectId === project.id && editingCell?.field === 'tags' ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={finishEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  className="tag-badge-input"
                  style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '11px', borderRadius: '12px', border: '1px solid #007bff' }}
                />
              ) : (
                <div 
                  className="tag-badge editable" 
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Tag badge clicked!', project.id, project.tags);
                    startEdit(project.id, 'tags', project.tags);
                  }}
                  title="Click to edit tag"
                >
                  {project.tags || 'Tag'}
                </div>
              )}
            </div>
            
            <div className="card-body">
              {renderField(project, 'client', project.client, 'Client')}
              {renderField(project, 'email', project.email, 'Email')}
              {renderField(project, 'phone', project.phone, 'Phone')}
              {renderField(project, 'preparedFor', project.preparedFor, 'Prepared for')}
              {renderField(project, 'address', project.address, 'Address')}
              {project.geoAddress && renderField(project, 'geoAddress', project.geoAddress, 'Geo Address')}
              {renderField(project, 'parcel', project.parcel, 'Parcel/APN')}
              {renderField(project, 'area', project.area, 'Area (ACERS)')}
              {renderField(project, 'serviceType', project.serviceType, 'Service')}
              {renderField(project, 'costEstimate', project.costEstimate, 'Cost Est.')}
              {renderField(project, 'action', project.action, 'Action')}
              {renderField(project, 'filename', project.filename, 'Filename')}
            </div>

            <div className="card-footer">
              {renderField(project, 'created', project.created, 'Created', true)}
              {renderField(project, 'modified', project.modified, 'Modified', true)}
            </div>

            <div className="card-notes">
              {renderField(project, 'notes', project.notes, 'Notes')}
            </div>

            <div className="card-actions">
              {showDeletePrompt === project.id ? (
                <div className="delete-prompt">
                  <input
                    type="password"
                    placeholder="Enter password to delete"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmDelete()}
                    className="password-input"
                    autoFocus
                  />
                  <button onClick={confirmDelete} className="btn-confirm">Delete</button>
                  <button onClick={cancelDelete} className="btn-cancel">Cancel</button>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => openInGoogleMaps(project.address)}
                    className="btn-action"
                    disabled={!project.address}
                    title="Open in Google Maps"
                  >
                    📍 Maps
                  </button>
                  <button 
                    onClick={() => openInRegrid(project.address, project.parcel, project.geoAddress)}
                    className="btn-action"
                    disabled={!project.address && !project.parcel}
                    title="Copy address and open Regrid"
                  >
                    🗺️ Regrid
                  </button>
                  <button 
                    onClick={() => handleOneDriveClick(project)}
                    className="btn-action onedrive-button"
                    title="Open OneDrive folder"
                  >
                    📁 OneDrive
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(project.id)}
                    className="btn-delete"
                    title="Delete project"
                  >
                    🗑️ Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectCards;
