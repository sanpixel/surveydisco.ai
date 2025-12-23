import React, { useState, useEffect } from 'react';
import fileCacheService from '../services/fileCacheService';
import errorHandlingService from '../services/errorHandlingService';

const ThumbnailLoader = ({ file, className = "file-thumbnail" }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState(file.thumbnailUrl || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!thumbnailUrl && file.id && isThumbnailSupported(file.mimeType)) {
      loadThumbnail();
    }
  }, [file.id, file.mimeType, thumbnailUrl]);

  const isThumbnailSupported = (mimeType) => {
    if (!mimeType) return false;
    
    const supportedTypes = [
      'image/',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint'
    ];
    
    return supportedTypes.some(type => mimeType.startsWith(type) || mimeType.includes(type));
  };

  const loadThumbnail = async () => {
    setLoading(true);
    setError(false);
    
    try {
      // Check file size for thumbnail generation
      const sizeValidation = errorHandlingService.validateFileSize(file, 'thumbnail');
      if (!sizeValidation.valid) {
        console.warn('File too large for thumbnail:', sizeValidation.error);
        setError(true);
        return;
      }

      const result = await errorHandlingService.handleApiCall(
        'load_thumbnail',
        async () => {
          const url = await fileCacheService.loadThumbnailWithCache(
            file.id,
            async () => {
              const response = await fetch(`/api/onedrive/public-thumbnails/${file.jobNumber || 'unknown'}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  fileId: file.id,
                  size: 'medium' // Options: small, medium, large
                })
              });
              
              if (!response.ok) {
                const error = new Error(`Failed to load thumbnail: ${response.statusText}`);
                error.status = response.status;
                throw error;
              }
              
              const data = await response.json();
              return data.thumbnailUrl;
            }
          );
          return url;
        },
        { fileId: file.id, projectId: file.projectId }
      );

      if (result.success && result.data) {
        setThumbnailUrl(result.data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error loading thumbnail:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (mimeType) => {
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

  if (loading) {
    return (
      <div className={`${className} thumbnail-loading`}>
        <div className="thumbnail-spinner"></div>
      </div>
    );
  }

  if (thumbnailUrl && !error) {
    return (
      <img 
        src={thumbnailUrl} 
        alt={file.name}
        className={className}
        onError={() => setError(true)}
        loading="lazy"
      />
    );
  }

  // Fallback to file type icon
  return (
    <div className={`${className} file-icon-fallback`}>
      {getFileIcon(file.mimeType)}
    </div>
  );
};

export default ThumbnailLoader;