import React, { useState } from 'react';
import './ProjectCards.css';
import { openOneDriveFolder } from '../services/onedriveService';
import FlippableCard from './FlippableCard';

const ProjectCards = ({ projects, onUpdate, onDelete }) => {
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [password, setPassword] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [flippedCards, setFlippedCards] = useState(new Set());

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

  const openGSCCCA = (geoAddress) => {
    if (geoAddress) {
      const url = `https://search.gsccca.org/PT61Premium/MapSearch.aspx?address=${encodeURIComponent(geoAddress)}`;
      window.open(url, '_blank');
    }
  };

  const handleOneDriveClick = async (project) => {
    if (project.onedrivefolderurl) {
      // Direct link to shared folder
      window.open(project.onedrivefolderurl, '_blank');
    } else {
      alert('OneDrive folder not initialized. Please click "Init" first.');
    }
  };

  const toggleCardExpansion = (projectId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedCards(newExpanded);
  };

  const handleCardFlip = (projectId, isFlipped) => {
    const newFlipped = new Set(flippedCards);
    if (isFlipped) {
      newFlipped.add(projectId);
    } else {
      newFlipped.delete(projectId);
    }
    setFlippedCards(newFlipped);
  };

  const handleFileSelect = (file) => {
    console.log('File selected:', file);
    // Handle file selection if needed
  };

  const handleInitOneDrive = async (project) => {
    try {
      console.log('Initializing OneDrive folder for project:', project.jobNumber);
      
      const response = await fetch('/api/onedrive/init-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobNumber: project.jobNumber,
          clientName: project.client,
          geoAddress: project.geoAddress,
          projectId: project.id
        })
      });

      const data = await response.json();

      if (data.requiresAuth) {
        // User needs to authenticate - redirect to OAuth
        console.log('OneDrive authentication required, redirecting to OAuth');
        window.open(data.authUrl, '_blank');
        return;
      }

      if (data.success) {
        console.log('Successfully initialized OneDrive folder');
        // Update the project in state with the new folder URL
        const updatedProject = { ...project, onedrivefolderurl: data.folderUrl };
        onUpdate(updatedProject);
        alert('OneDrive folder initialized successfully!');
      } else {
        throw new Error(data.error || 'Failed to initialize folder');
      }
    } catch (error) {
      console.error('Failed to initialize OneDrive folder:', error);
      alert('Failed to initialize OneDrive folder. Please try again.');
    }
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
          <FlippableCard 
            key={project.id} 
            project={project}
            onFlip={handleCardFlip}
            onFileSelect={handleFileSelect}
          >
            {({ onFlip: flipCard }) => (
            <div className="project-card">
              <div className="card-header">
                <div className="job-number" onClick={flipCard}>#{project.jobNumber}</div>
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

              {/* Additional surveying fields - expandable section */}
              {expandedCards.has(project.id) && (
                <div className="card-additional">
                  <div className="additional-header">Surveying Details</div>
                  {renderField(project, 'landLot', project.landLot, 'Land Lot')}
                  {renderField(project, 'district', project.district, 'District')}
                  {renderField(project, 'county', project.county, 'County')}
                  {renderField(project, 'deedBook', project.deedBook, 'Deed Book')}
                  {renderField(project, 'deedPage', project.deedPage, 'Deed Page')}
                  {renderField(project, 'platBook', project.platBook, 'Plat Book')}
                  {renderField(project, 'platPage', project.platPage, 'Plat Page')}
                </div>
              )}

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
                      onClick={() => openGSCCCA(project.geoAddress)}
                      className="btn-action gsccca-button"
                      disabled={!project.geoAddress}
                      title="Open GSCCCA with address"
                    >
                      🏛️ GSCCCA
                    </button>
                    <button 
                      onClick={() => toggleCardExpansion(project.id)}
                      className="btn-action expand-button"
                      title={expandedCards.has(project.id) ? "Hide surveying details" : "Show surveying details"}
                    >
                      {expandedCards.has(project.id) ? '📋 Less' : '📋 More'}
                    </button>
                    <button 
                      onClick={() => handleInitOneDrive(project)}
                      className="btn-action init-button"
                      title="Initialize OneDrive folder"
                    >
                      🔧 Init
                    </button>
                    <button 
                      onClick={() => handleOneDriveClick(project)}
                      className={`btn-action onedrive-button ${!project.onedrivefolderurl ? 'disabled' : ''}`}
                      disabled={!project.onedrivefolderurl}
                      title={project.onedrivefolderurl ? "Open OneDrive folder" : "Folder not initialized"}
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
            )}
          </FlippableCard>
        ))}
      </div>
    </div>
  );
};

export default ProjectCards;
