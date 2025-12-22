// File caching service for OneDrive files and thumbnails
class FileCacheService {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50; // Maximum number of file previews to cache in memory
    this.sessionStoragePrefix = 'onedrive_cache_';
  }

  // Session storage utilities for file and thumbnail caching
  getCachedFiles(projectId) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}files_${projectId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (1 hour expiration)
        const now = Date.now();
        if (now - data.timestamp < 3600000) { // 1 hour in milliseconds
          return data.files;
        } else {
          // Cache expired, remove it
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to read cached files:', error);
    }
    return null;
  }

  setCachedFiles(projectId, files) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}files_${projectId}`;
      const data = {
        files,
        timestamp: Date.now()
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache files:', error);
    }
  }

  getCachedThumbnail(fileId) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}thumb_${fileId}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (24 hours for thumbnails)
        const now = Date.now();
        if (now - data.timestamp < 86400000) { // 24 hours in milliseconds
          return data.thumbnailUrl;
        } else {
          // Cache expired, remove it
          sessionStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Failed to read cached thumbnail:', error);
    }
    return null;
  }

  setCachedThumbnail(fileId, thumbnailUrl) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}thumb_${fileId}`;
      const data = {
        thumbnailUrl,
        timestamp: Date.now()
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to cache thumbnail:', error);
    }
  }

  // Memory cache for file previews with size limits
  getCachedPreview(fileId) {
    return this.memoryCache.get(fileId);
  }

  setCachedPreview(fileId, previewData) {
    // Implement LRU eviction if cache is full
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      // Remove the oldest entry (first key in Map)
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }
    
    this.memoryCache.set(fileId, {
      data: previewData,
      timestamp: Date.now()
    });
  }

  // Cache invalidation on card flip
  invalidateProjectCache(projectId) {
    try {
      // Remove files cache
      const filesCacheKey = `${this.sessionStoragePrefix}files_${projectId}`;
      sessionStorage.removeItem(filesCacheKey);
      
      // Remove all thumbnail caches for this project
      // Note: We don't have a direct way to map fileIds to projectId in session storage,
      // so we'll let thumbnails expire naturally or implement a more sophisticated mapping
      
      console.log(`Cache invalidated for project ${projectId}`);
    } catch (error) {
      console.warn('Failed to invalidate cache:', error);
    }
  }

  // Handle cache expiration and refresh logic
  isExpired(timestamp, maxAge) {
    return Date.now() - timestamp > maxAge;
  }

  // Clear all caches (useful for debugging or memory management)
  clearAllCaches() {
    try {
      // Clear session storage caches
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.sessionStoragePrefix)) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Clear memory cache
      this.memoryCache.clear();
      
      console.log('All caches cleared');
    } catch (error) {
      console.warn('Failed to clear caches:', error);
    }
  }

  // Get cache statistics (useful for debugging)
  getCacheStats() {
    const sessionCacheCount = Object.keys(sessionStorage)
      .filter(key => key.startsWith(this.sessionStoragePrefix))
      .length;
    
    return {
      sessionCacheEntries: sessionCacheCount,
      memoryCacheEntries: this.memoryCache.size,
      maxMemoryCacheSize: this.maxMemoryCacheSize
    };
  }

  // Enhanced file loading with caching
  async loadFilesWithCache(projectId, fetchFunction) {
    // Try to get from cache first
    const cachedFiles = this.getCachedFiles(projectId);
    if (cachedFiles) {
      return cachedFiles;
    }

    // If not in cache, fetch from API
    try {
      const files = await fetchFunction();
      
      // Cache the results
      this.setCachedFiles(projectId, files);
      
      // Also cache any thumbnails that came with the files
      files.forEach(file => {
        if (file.thumbnailUrl) {
          this.setCachedThumbnail(file.id, file.thumbnailUrl);
        }
      });
      
      return files;
    } catch (error) {
      // If fetch fails, return empty array but don't cache the failure
      console.error('Failed to load files:', error);
      throw error;
    }
  }

  // Enhanced thumbnail loading with caching
  async loadThumbnailWithCache(fileId, fetchFunction) {
    // Try to get from cache first
    const cachedThumbnail = this.getCachedThumbnail(fileId);
    if (cachedThumbnail) {
      return cachedThumbnail;
    }

    // If not in cache, fetch from API
    try {
      const thumbnailUrl = await fetchFunction();
      
      // Cache the result
      if (thumbnailUrl) {
        this.setCachedThumbnail(fileId, thumbnailUrl);
      }
      
      return thumbnailUrl;
    } catch (error) {
      console.error('Failed to load thumbnail:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new FileCacheService();