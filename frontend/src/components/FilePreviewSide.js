import React, { useState, useEffect } from 'react';
import './FilePreviewSide.css';
import fileCacheService from '../services/fileCacheService';
import errorHandlingService from '../services/errorHandlingService';
import ThumbnailLoader from './ThumbnailLoader';
import QuickPreviewModal from './QuickPreviewModal';

const FilePreviewSide = ({ project, onFileSelect, isVisible = false }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Only load files when the component becomes visible AND has a folder URL
    if (isVisible && project?.onedrivefolderurl && !hasLoaded) {
      console.log('👁️ [FilePreview] Component became visible, loading files for project:', project.jobNumber);
      loadFiles();
    } else if (isVisible && !project?.onedrivefolderurl) {
      console.log('⚠️ [FilePreview] Component visible but no OneDrive folder URL for project:', project.jobNumber);
    } else if (!isVisible) {
      console.log('👁️‍🗨️ [FilePreview] Component not visible for project:', project.jobNumber);
    }
  }, [isVisible, project?.onedrivefolderurl, hasLoaded]);

  const loadFiles = async () => {
    console.log('🔄 [FilePreview] Starting to load files for project:', project.jobNumber);
    setLoading(true);
    setError(null);
    
    try {
      const result = await errorHandlingService.handleApiCall(
        'load_files',
        async () => {
          const files = await fileCacheService.loadFilesWithCache(
            project.jobNumber,
            async () => {
              console.log('🌐 [FilePreview] Making API call to:', `/api/onedrive/public-files/${project.jobNumber}`);
              const response = await fetch(`/api/onedrive/public-files/${project.jobNumber}`);
              
              if (!response.ok) {
                console.log('❌ [FilePreview] API call failed with status:', response.status, response.statusText);
                const error = new Error(`Failed to load files: ${response.statusText}`);
                error.status = response.status;
                throw error;
              }
              
              const data = await response.json();
              console.log('✅ [FilePreview] API response received:', data.files ? data.files.length : 0, 'files');
              return data.files || [];
            }
          );
          return files;
        },
        { jobNumber: project.jobNumber }
      );

      if (result.success) {
        console.log('✅ [FilePreview] Files loaded successfully:', result.data.length, 'files');
        setFiles(result.data);
        setHasLoaded(true);
      } else {
        console.log('❌ [FilePreview] Failed to load files:', result.error);
        const gracefulError = errorHandlingService.getGracefulErrorMessage(
          { message: result.error },
          { operation: 'loading files' }
        );
        setError(gracefulError);
      }
    } catch (err) {
      console.error('❌ [FilePreview] Error loading files:', err);
      const gracefulError = errorHandlingService.getGracefulErrorMessage(
        err,
        { operation: 'loading files' }
      );
      setError(gracefulError);
    } finally {
      setLoading(false);
    }
  };

  const handleFileClick = (file) => {
    setSelectedFile(file);
    setShowPreview(true);
    
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setSelectedFile(null);
  };

  const handleRetry = async () => {
    console.log('🔄 [FilePreview] Retry button clicked for project:', project.jobNumber);
    // Check connectivity first
    const connectivity = await errorHandlingService.checkConnectivity();
    if (!connectivity.online) {
      console.log('❌ [FilePreview] No internet connection detected');
      const gracefulError = errorHandlingService.getGracefulErrorMessage(
        { message: 'No internet connection' },
        { operation: 'connectivity check' }
      );
      setError(gracefulError);
      return;
    }

    // Invalidate cache before retrying
    console.log('🗑️ [FilePreview] Invalidating cache for project:', project.jobNumber);
    fileCacheService.invalidateProjectCache(project.jobNumber);
    setHasLoaded(false); // Reset loaded state to allow reload
    loadFiles();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getFileIcon = (mimeType) => {
    // This function is now handled by ThumbnailLoader, but keeping for backward compatibility
    if (!mimeType) return '📄';
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊';
    if (mimeType.includes('text')) return '📄';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return '🗜️';
    
    return '📄';
  };

  if (!project?.onedrivefolderurl) {
    return (
      <div className="file-preview-side">
        <div className="file-preview-header">
          <h3>Project Files</h3>
        </div>
        <div className="file-preview-content">
          <div className="folder-not-initialized">
            <div className="init-icon">📁</div>
            <h4>OneDrive folder not initialized</h4>
            <p>Click "Init" on the front of the card to set up file access</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="file-preview-side">
        <div className="file-preview-header">
          <h3>Project Files</h3>
        </div>
        <div className="file-preview-content">
          <div className="files-loading">
            <div className="loading-spinner"></div>
            <p>Loading files from OneDrive...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-preview-side">
        <div className="file-preview-header">
          <h3>Project Files</h3>
        </div>
        <div className="file-preview-content">
          <div className="files-error">
            <div className="error-icon">⚠️</div>
            <h4>{error.title || 'Failed to load files'}</h4>
            <p>{error.message || error}</p>
            {error.suggestion && (
              <p className="error-suggestion">{error.suggestion}</p>
            )}
            <button onClick={handleRetry} className="retry-button">
              🔄 {error.action === 'refresh' ? 'Refresh' : 'Retry'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="file-preview-side">
        <div className="file-preview-header">
          <h3>Project Files</h3>
        </div>
        <div className="file-preview-content">
          <div className="no-files">
            <div className="empty-icon">📂</div>
            <h4>No files found</h4>
            <p>This folder appears to be empty</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="file-preview-side">
      <div className="file-preview-header">
        <h3>Project Files</h3>
        <div className="file-count">{files.length} file{files.length !== 1 ? 's' : ''}</div>
      </div>
      <div className="file-preview-content">
        <div className="files-list">
          {files.map((file) => (
            <div 
              key={file.id} 
              className="file-item"
              onClick={() => handleFileClick(file)}
              title={`Click to preview ${file.name}`}
            >
              <div className="file-icon">
                <ThumbnailLoader 
                  file={{ ...file, projectId: project.id }} 
                  className="file-thumbnail"
                />
              </div>
              <div className="file-details">
                <div className="file-name" title={file.name}>
                  {file.name}
                </div>
                <div className="file-metadata">
                  <span className="file-size">{formatFileSize(file.size)}</span>
                  <span className="file-date">{formatDate(file.lastModified)}</span>
                </div>
              </div>
              <div className="file-actions">
                <button 
                  className="file-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.webUrl, '_blank');
                  }}
                  title="Open in OneDrive"
                >
                  🔗
                </button>
                <button 
                  className="file-action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (file.downloadUrl) {
                      window.open(file.downloadUrl, '_blank');
                    } else {
                      // Fallback to webUrl if downloadUrl not available
                      window.open(file.webUrl, '_blank');
                    }
                  }}
                  title="Download file"
                >
                  ⬇️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <QuickPreviewModal 
        file={selectedFile}
        isOpen={showPreview}
        onClose={handleClosePreview}
      />
    </div>
  );
};

export default FilePreviewSide;