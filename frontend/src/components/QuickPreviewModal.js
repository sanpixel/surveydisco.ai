import React, { useState, useEffect, useRef } from 'react';
import './QuickPreviewModal.css';
import fileCacheService from '../services/fileCacheService';
import errorHandlingService from '../services/errorHandlingService';

const QuickPreviewModal = ({ file, isOpen, onClose }) => {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);
  const modalRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen && file) {
      loadFileContent();
    } else {
      resetState();
    }
  }, [isOpen, file]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      } else if (e.key === 'ArrowRight' && currentPage < totalPages) {
        setCurrentPage(prev => prev + 1);
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-') {
        handleZoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, totalPages, onClose]);

  const resetState = () => {
    setContent(null);
    setLoading(false);
    setError(null);
    setCurrentPage(1);
    setTotalPages(1);
    setZoomLevel(1);
  };

  const loadFileContent = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check if file is previewable
      if (!isPreviewable(file)) {
        setError('This file type cannot be previewed. Click download to view the file.');
        return;
      }

      // Check file size limits with proper operation type
      let operation = 'preview';
      if (file.mimeType.includes('pdf')) {
        operation = 'pdf_preview';
      } else if (file.mimeType.startsWith('image/')) {
        operation = 'image_preview';
      }

      const sizeValidation = errorHandlingService.validateFileSize(file, operation);
      if (!sizeValidation.valid) {
        setError(sizeValidation.error);
        return;
      }

      // Try to get from cache first
      const cachedContent = fileCacheService.getCachedPreview(file.id);
      if (cachedContent && !fileCacheService.isExpired(cachedContent.timestamp, 3600000)) { // 1 hour cache
        setContent(cachedContent.data);
        if (cachedContent.data.totalPages) {
          setTotalPages(cachedContent.data.totalPages);
        }
        return;
      }

      // Load content from API with error handling
      const result = await errorHandlingService.handleApiCall(
        'load_file_content',
        async () => {
          const response = await fetch(`/api/onedrive/public-file-content/${file.projectId || 'unknown'}/${file.id}`, {
            method: 'GET',
            headers: {
              'Accept': getAcceptHeader(file.mimeType)
            }
          });

          if (!response.ok) {
            const error = new Error(`Failed to load file content: ${response.statusText}`);
            error.status = response.status;
            throw error;
          }

          return response;
        },
        { fileId: file.id, projectId: file.projectId }
      );

      if (!result.success) {
        const gracefulError = errorHandlingService.getGracefulErrorMessage(
          { message: result.error },
          { operation: 'file preview', fileType: file.mimeType, fileName: file.name }
        );
        setError(`${gracefulError.title}: ${gracefulError.message}`);
        return;
      }

      const response = result.data;
      let contentData;

      if (file.mimeType.startsWith('image/')) {
        // For images, get the blob and create object URL
        const blob = await response.blob();
        contentData = {
          type: 'image',
          url: URL.createObjectURL(blob),
          originalSize: { width: 0, height: 0 } // Will be set when image loads
        };
      } else if (file.mimeType.includes('pdf')) {
        // For PDFs, we'll need to handle this differently
        // For now, show download option
        contentData = {
          type: 'pdf',
          message: 'PDF preview not yet implemented. Click download to view the file.'
        };
      } else {
        // For other file types, show download option
        contentData = {
          type: 'unsupported',
          message: 'This file type cannot be previewed. Click download to view the file.'
        };
      }

      setContent(contentData);
      
      // Cache the content
      fileCacheService.setCachedPreview(file.id, contentData);
      
    } catch (err) {
      console.error('Error loading file content:', err);
      const gracefulError = errorHandlingService.getGracefulErrorMessage(
        err,
        { operation: 'file preview', fileType: file.mimeType, fileName: file.name }
      );
      setError(`${gracefulError.title}: ${gracefulError.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isPreviewable = (file) => {
    if (!file.mimeType) return false;
    
    const previewableTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf'
    ];
    
    return previewableTypes.some(type => file.mimeType === type || file.mimeType.startsWith(type));
  };

  const getSizeLimit = (mimeType) => {
    if (mimeType.includes('pdf')) {
      return 10 * 1024 * 1024; // 10MB for PDFs
    } else if (mimeType.startsWith('image/')) {
      return 50 * 1024 * 1024; // 50MB for images
    }
    return 5 * 1024 * 1024; // 5MB default
  };

  const getAcceptHeader = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return 'image/*';
    } else if (mimeType.includes('pdf')) {
      return 'application/pdf';
    }
    return '*/*';
  };

  const formatFileSize = (bytes) => {
    return errorHandlingService.formatFileSize(bytes);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleDownload = () => {
    if (file.downloadUrl) {
      window.open(file.downloadUrl, '_blank');
    } else if (file.webUrl) {
      window.open(file.webUrl, '_blank');
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleImageLoad = (e) => {
    if (content && content.type === 'image') {
      setContent(prev => ({
        ...prev,
        originalSize: {
          width: e.target.naturalWidth,
          height: e.target.naturalHeight
        }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="quick-preview-modal"
      ref={modalRef}
      onClick={handleBackdropClick}
    >
      <div className="modal-content">
        <div className="modal-header">
          <div className="file-info">
            <h3 className="file-name" title={file?.name}>
              {file?.name}
            </h3>
            <div className="file-details">
              <span className="file-size">{formatFileSize(file?.size)}</span>
              <span className="file-type">{file?.mimeType}</span>
            </div>
          </div>
          <div className="modal-controls">
            {content?.type === 'image' && (
              <>
                <button 
                  className="control-btn"
                  onClick={handleZoomOut}
                  title="Zoom out (-)"
                  disabled={zoomLevel <= 0.1}
                >
                  🔍-
                </button>
                <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
                <button 
                  className="control-btn"
                  onClick={handleZoomIn}
                  title="Zoom in (+)"
                  disabled={zoomLevel >= 5}
                >
                  🔍+
                </button>
                <button 
                  className="control-btn"
                  onClick={handleResetZoom}
                  title="Reset zoom"
                >
                  ↻
                </button>
              </>
            )}
            <button 
              className="control-btn download-btn"
              onClick={handleDownload}
              title="Download file"
            >
              ⬇️
            </button>
            <button 
              className="control-btn close-btn"
              onClick={onClose}
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="modal-body" ref={contentRef}>
          {loading && (
            <div className="preview-loading">
              <div className="loading-spinner"></div>
              <p>Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="preview-error">
              <div className="error-icon">⚠️</div>
              <h4>Preview Error</h4>
              <p>{error}</p>
              <button onClick={handleDownload} className="download-fallback-btn">
                📥 Download File
              </button>
            </div>
          )}

          {content && !loading && !error && (
            <>
              {content.type === 'image' && (
                <div className="image-preview">
                  <img 
                    src={content.url}
                    alt={file.name}
                    style={{ 
                      transform: `scale(${zoomLevel})`,
                      maxWidth: zoomLevel === 1 ? '100%' : 'none',
                      maxHeight: zoomLevel === 1 ? '100%' : 'none'
                    }}
                    onLoad={handleImageLoad}
                  />
                </div>
              )}

              {content.type === 'pdf' && (
                <div className="pdf-preview">
                  <div className="pdf-placeholder">
                    <div className="pdf-icon">📕</div>
                    <h4>PDF Preview</h4>
                    <p>{content.message}</p>
                    <button onClick={handleDownload} className="download-fallback-btn">
                      📥 Download PDF
                    </button>
                  </div>
                </div>
              )}

              {content.type === 'unsupported' && (
                <div className="unsupported-preview">
                  <div className="unsupported-icon">📄</div>
                  <h4>Preview Not Available</h4>
                  <p>{content.message}</p>
                  <button onClick={handleDownload} className="download-fallback-btn">
                    📥 Download File
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {content?.type === 'pdf' && totalPages > 1 && (
          <div className="modal-footer">
            <div className="page-controls">
              <button 
                className="control-btn"
                onClick={() => setCurrentPage(prev => prev - 1)}
                disabled={currentPage <= 1}
                title="Previous page (←)"
              >
                ←
              </button>
              <span className="page-info">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                className="control-btn"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={currentPage >= totalPages}
                title="Next page (→)"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickPreviewModal;