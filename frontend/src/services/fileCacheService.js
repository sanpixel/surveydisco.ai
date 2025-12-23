// File caching service for OneDrive files and thumbnails
class FileCacheService {
  constructor() {
    this.memoryCache = new Map();
    this.maxMemoryCacheSize = 50; // Maximum number of file previews to cache in memory
    this.sessionStoragePrefix = 'onedrive_cache_';
  }

  // Session storage utilities for file and thumbnail caching
  getCachedFiles(jobNumber) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}files_${jobNumber}`;
      console.log('🗂️ [FileCache] Checking cache for job:', jobNumber);
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still valid (1 hour expiration)
        const now = Date.now();
        if (now - data.timestamp < 3600000) { // 1 hour in milliseconds
          console.log('✅ [FileCache] Cache hit for job:', jobNumber, '- returning', data.files.length, 'files');
          return data.files;
        } else {
          // Cache expired, remove it
          console.log('⏰ [FileCache] Cache expired for job:', jobNumber, '- removing');
          sessionStorage.removeItem(cacheKey);
        }
      } else {
        console.log('❌ [FileCache] No cache found for job:', jobNumber);
      }
    } catch (error) {
      console.warn('❌ [FileCache] Failed to read cached files:', error);
    }
    return null;
  }

  setCachedFiles(jobNumber, files) {
    try {
      const cacheKey = `${this.sessionStoragePrefix}files_${jobNumber}`;
      console.log('💾 [FileCache] Caching', files.length, 'files for job:', jobNumber);
      const data = {
        files,
        timestamp: Date.now()
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('❌ [FileCache] Failed to cache files:', error);
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
  invalidateProjectCache(jobNumber) {
    try {
      // Remove files cache
      const filesCacheKey = `${this.sessionStoragePrefix}files_${jobNumber}`;
      console.log('🗑️ [FileCache] Invalidating cache for job:', jobNumber);
      sessionStorage.removeItem(filesCacheKey);
      
      // Remove all thumbnail caches for this project
      // Note: We don't have a direct way to map fileIds to jobNumber in session storage,
      // so we'll let thumbnails expire naturally or implement a more sophisticated mapping
      
      console.log('✅ [FileCache] Cache invalidated for job:', jobNumber);
    } catch (error) {
      console.warn('❌ [FileCache] Failed to invalidate cache:', error);
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
  async loadFilesWithCache(jobNumber, fetchFunction) {
    console.log('📂 [FileCache] loadFilesWithCache called for job:', jobNumber);
    // Try to get from cache first
    const cachedFiles = this.getCachedFiles(jobNumber);
    if (cachedFiles) {
      console.log('✅ [FileCache] Returning cached files for job:', jobNumber);
      return cachedFiles;
    }

    // If not in cache, fetch from API
    try {
      console.log('🌐 [FileCache] No cache found, fetching from API for job:', jobNumber);
      const files = await fetchFunction();
      
      // Cache the results
      this.setCachedFiles(jobNumber, files);
      
      // Also cache any thumbnails that came with the files
      files.forEach(file => {
        if (file.thumbnailUrl) {
          this.setCachedThumbnail(file.id, file.thumbnailUrl);
        }
      });
      
      return files;
    } catch (error) {
      // If fetch fails, return empty array but don't cache the failure
      console.error('❌ [FileCache] Failed to load files for job:', jobNumber, error);
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