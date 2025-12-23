// Error handling service for OneDrive file operations
class ErrorHandlingService {
  constructor() {
    // No retry logic - fail fast and clear
  }

  // File size limits (in bytes)
  static FILE_SIZE_LIMITS = {
    PDF_PREVIEW: 10 * 1024 * 1024,    // 10MB for PDF previews
    IMAGE_PREVIEW: 50 * 1024 * 1024,  // 50MB for image previews
    GENERAL_PREVIEW: 5 * 1024 * 1024, // 5MB for other file types
    THUMBNAIL: 2 * 1024 * 1024        // 2MB for thumbnails
  };

  // Check if file size is within limits for preview
  validateFileSize(file, operation = 'preview') {
    if (!file || !file.size) {
      return { valid: true };
    }

    let limit;
    switch (operation) {
      case 'pdf_preview':
        limit = ErrorHandlingService.FILE_SIZE_LIMITS.PDF_PREVIEW;
        break;
      case 'image_preview':
        limit = ErrorHandlingService.FILE_SIZE_LIMITS.IMAGE_PREVIEW;
        break;
      case 'thumbnail':
        limit = ErrorHandlingService.FILE_SIZE_LIMITS.THUMBNAIL;
        break;
      default:
        limit = ErrorHandlingService.FILE_SIZE_LIMITS.GENERAL_PREVIEW;
    }

    if (file.size > limit) {
      return {
        valid: false,
        error: `File is too large for ${operation} (${this.formatFileSize(file.size)}). Maximum size: ${this.formatFileSize(limit)}`,
        fileSize: file.size,
        limit: limit
      };
    }

    return { valid: true };
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Simple API call handler - no retries, just fail fast with clear errors
  async handleApiCall(operation, apiCall, context = {}) {
    try {
      const result = await apiCall();
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error(`API call failed for ${operation}:`, error);
      
      return {
        success: false,
        error: this.formatError(error, operation),
        canRetry: true
      };
    }
  }

  // Format error messages for user display
  formatError(error, operation) {
    if (error.status) {
      switch (error.status) {
        case 400:
          return `Invalid request for ${operation}. Please check the file and try again.`;
        case 401:
          return `Authentication required for ${operation}. Please refresh the page and try again.`;
        case 403:
          return `Access denied for ${operation}. You may not have permission to view this file.`;
        case 404:
          return `File not found for ${operation}. The file may have been moved or deleted.`;
        case 413:
          return `File is too large for ${operation}. Please try with a smaller file.`;
        case 429:
          return `Too many requests for ${operation}. Please wait a moment and try again.`;
        case 500:
        case 502:
        case 503:
        case 504:
          return `Server error during ${operation}. OneDrive service may be unavailable.`;
        default:
          return `Error during ${operation} (${error.status}). Please try again.`;
      }
    }

    // Network and other errors
    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      return `Network error during ${operation}. Please check your connection and try again.`;
    }

    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return `Request timed out during ${operation}. Please try again.`;
    }

    // Generic error
    return `An error occurred during ${operation}: ${error.message || 'Unknown error'}`;
  }

  // Handle network connectivity issues
  async checkConnectivity() {
    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      return {
        online: response.ok,
        status: response.status
      };
    } catch (error) {
      return {
        online: false,
        error: error.message
      };
    }
  }

  // Graceful error messages for different scenarios
  getGracefulErrorMessage(error, context = {}) {
    const { operation, fileType, fileName } = context;
    
    // File size errors
    if (error.message && error.message.includes('too large')) {
      return {
        title: 'File Too Large',
        message: error.message,
        suggestion: 'Try downloading the file to view it locally.',
        action: 'download'
      };
    }

    // Network errors
    if (error.message && (error.message.includes('network') || error.message.includes('fetch'))) {
      return {
        title: 'Connection Issue',
        message: 'Unable to connect to OneDrive. Please check your internet connection.',
        suggestion: 'Check your connection and try again.',
        action: 'retry'
      };
    }

    // Permission errors
    if (error.message && error.message.includes('Access denied')) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this file.',
        suggestion: 'Contact the file owner to request access.',
        action: 'contact'
      };
    }

    // File not found
    if (error.message && error.message.includes('not found')) {
      return {
        title: 'File Not Found',
        message: 'This file may have been moved or deleted.',
        suggestion: 'Refresh the file list to see current files.',
        action: 'refresh'
      };
    }

    // Generic error
    return {
      title: 'Something Went Wrong',
      message: error.message || 'An unexpected error occurred.',
      suggestion: 'Please try again in a few moments.',
      action: 'retry'
    };
  }
}

// Export a singleton instance
export default new ErrorHandlingService();