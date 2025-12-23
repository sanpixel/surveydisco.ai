const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

class MicrosoftGraphService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.tenantId = process.env.MICROSOFT_TENANT_ID;
    this.redirectUri = process.env.CLOUD_RUN_URL ? `${process.env.CLOUD_RUN_URL}/api/onedrive/callback` : 'http://localhost:8080/api/onedrive/callback';
    
    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      console.error('Microsoft Graph credentials missing from environment variables');
      this.msalClient = null;
      return;
    }

    try {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: this.clientId,
          clientSecret: this.clientSecret,
          authority: `https://login.microsoftonline.com/consumers`
        }
      });
    } catch (error) {
      console.error('Failed to initialize MSAL client:', error);
      this.msalClient = null;
    }
  }

  getAuthUrl() {
    if (!this.msalClient) {
      throw new Error('MSAL client not initialized');
    }

    const authCodeUrlParameters = {
      scopes: ['Files.ReadWrite', 'offline_access'],
      redirectUri: this.redirectUri,
    };

    return this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  async getTokenFromCode(code) {
    if (!this.msalClient) {
      throw new Error('MSAL client not initialized');
    }

    const tokenRequest = {
      code: code,
      scopes: ['Files.ReadWrite', 'offline_access'],
      redirectUri: this.redirectUri,
    };

    const response = await this.msalClient.acquireTokenByCode(tokenRequest);
    
    // MSAL stores tokens in cache, get the account to retrieve refresh token
    const accounts = await this.msalClient.getTokenCache().getAllAccounts();
    let refreshToken = null;
    
    // Try to get refresh token from cache
    const cache = this.msalClient.getTokenCache().serialize();
    const cacheData = JSON.parse(cache);
    
    // Find refresh token in cache
    if (cacheData.RefreshToken) {
      const refreshTokenKeys = Object.keys(cacheData.RefreshToken);
      if (refreshTokenKeys.length > 0) {
        refreshToken = cacheData.RefreshToken[refreshTokenKeys[0]].secret;
      }
    }
    
    console.log('[OneDrive] Got access token, refresh token:', refreshToken ? 'found' : 'NOT FOUND');
    
    return {
      accessToken: response.accessToken,
      refreshToken: refreshToken
    };
  }

  async getAccessTokenFromRefresh(refreshToken) {
    if (!this.msalClient) {
      throw new Error('MSAL client not initialized');
    }

    const tokenRequest = {
      refreshToken: refreshToken,
      scopes: ['Files.ReadWrite'],
    };

    const response = await this.msalClient.acquireTokenByRefreshToken(tokenRequest);
    return response.accessToken;
  }

  createGraphClient(accessToken) {
    return Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  async createFolder(folderPath, accessToken) {
    const graphClient = this.createGraphClient(accessToken);

    try {
      const pathParts = folderPath.split('/');
      let currentPath = '';
      
      console.log('Creating folder structure:', pathParts);
      
      for (const part of pathParts) {
        if (!part) continue;
        
        const parentPath = currentPath || 'root';
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        try {
          // Check if folder exists
          const existingFolder = await graphClient.api(`/me/drive/root:/${currentPath}`).get();
          console.log(`Folder already exists: ${currentPath}`);
        } catch (error) {
          if (error.code === 'itemNotFound') {
            // Create folder - NEVER delete existing content
            console.log(`Creating new folder: ${part} in ${parentPath}`);
            const folderData = {
              name: part,
              folder: {},
              '@microsoft.graph.conflictBehavior': 'rename'  // Rename if conflict, never overwrite
            };
            
            const newFolder = await graphClient
              .api(`/me/drive/root:/${parentPath}:/children`)
              .post(folderData);
              
            console.log(`Successfully created folder: ${newFolder.name}`);
          } else {
            console.error('Unexpected error checking folder:', error);
            throw error;
          }
        }
      }
      
      return currentPath;
    } catch (error) {
      console.error('Error creating folder structure:', error);
      
      // Provide more specific error messages
      if (error.code === 'unauthenticated') {
        throw new Error('Microsoft Graph authentication failed');
      } else if (error.code === 'forbidden') {
        throw new Error('Insufficient permissions to access OneDrive');
      } else if (error.code === 'throttledRequest') {
        throw new Error('OneDrive service is busy - please try again in a moment');
      }
      
      throw error;
    }
  }

  async getFolderWebUrl(folderPath, accessToken) {
    const graphClient = this.createGraphClient(accessToken);

    try {
      console.log('Getting web URL for folder:', folderPath);
      const response = await graphClient
        .api(`/me/drive/root:/${folderPath}`)
        .get();
      
      console.log('Successfully retrieved folder web URL');
      return response.webUrl;
    } catch (error) {
      console.error('Error getting folder URL:', error);
      
      // Provide more specific error messages
      if (error.code === 'itemNotFound') {
        throw new Error('OneDrive folder not found - it may have been moved or deleted');
      } else if (error.code === 'unauthenticated') {
        throw new Error('Microsoft Graph authentication failed');
      } else if (error.code === 'forbidden') {
        throw new Error('Insufficient permissions to access OneDrive folder');
      }
      
      throw error;
    }
  }

  async checkFolderExists(folderPath, accessToken) {
    const graphClient = this.createGraphClient(accessToken);

    try {
      await graphClient.api(`/me/drive/root:/${folderPath}`).get();
      return true; // Folder exists
    } catch (error) {
      if (error.code === 'itemNotFound') {
        return false; // Folder doesn't exist
      }
      throw error; // Other error
    }
  }

  async downloadFileFromUrl(shareUrl, accessToken) {
    const graphClient = this.createGraphClient(accessToken);
    
    try {
      // The template file should be in the root _SurveyDisco folder
      const templatePath = '_SurveyDisco/SS_BLOCK_11X17.dwg';
      
      console.log('Downloading template file from:', templatePath);
      
      // Get file content as buffer
      const response = await graphClient
        .api(`/me/drive/root:/${templatePath}:/content`)
        .responseType('arraybuffer')
        .get();
        
      console.log('Template file downloaded successfully, size:', response.byteLength);
      return Buffer.from(response);
    } catch (error) {
      console.error('Error downloading template file:', error);
      
      if (error.code === 'itemNotFound') {
        throw new Error('Template file SS_BLOCK_11X17.dwg not found in _SurveyDisco folder');
      } else if (error.code === 'unauthenticated') {
        throw new Error('Authentication failed when accessing template file');
      } else if (error.code === 'forbidden') {
        throw new Error('Insufficient permissions to access template file');
      }
      
      throw new Error(`Failed to download template file: ${error.message}`);
    }
  }

  async uploadFile(folderPath, fileName, fileContent, accessToken) {
    const graphClient = this.createGraphClient(accessToken);

    try {
      const filePath = `${folderPath}/${fileName}`;
      
      // Check if file already exists (safety check)
      try {
        const existingFile = await graphClient.api(`/me/drive/root:/${filePath}`).get();
        console.log('File already exists, skipping upload:', fileName);
        return existingFile; // File exists, don't overwrite
      } catch (error) {
        if (error.code !== 'itemNotFound') {
          throw error;
        }
        // File doesn't exist, proceed with upload
      }

      console.log('Uploading file to OneDrive:', filePath);
      console.log('File size:', fileContent.length, 'bytes');
      
      // Use resumable upload for larger files (DWG files can be big)
      if (fileContent.length > 4 * 1024 * 1024) { // > 4MB
        console.log('Using resumable upload for large file');
        
        // Create upload session
        const uploadSession = await graphClient
          .api(`/me/drive/root:/${filePath}:/createUploadSession`)
          .post({
            item: {
              '@microsoft.graph.conflictBehavior': 'fail',
              name: fileName
            }
          });
          
        // Upload in chunks (this is simplified - production would need proper chunking)
        const response = await graphClient
          .api(uploadSession.uploadUrl)
          .put(fileContent);
          
        console.log('Large file uploaded successfully:', fileName);
        return response;
      } else {
        // Simple upload for smaller files
        const response = await graphClient
          .api(`/me/drive/root:/${filePath}:/content`)
          .header('Content-Type', 'application/octet-stream')
          .put(fileContent);
          
        console.log('File uploaded successfully:', fileName);
        return response;
      }
    } catch (error) {
      console.error('Error uploading file to OneDrive:', error);
      
      if (error.code === 'nameAlreadyExists') {
        console.log('File already exists (race condition), treating as success');
        return; // File was created by another process, that's fine
      }
      
      throw error;
    }
  }

  async getPublicFiles(shareUrl, accessToken) {
    try {
      // Extract folder path from the webUrl
      // Example: https://onedrive.live.com/?id=1F7F5C37636A6CA0%21s00f0d0d0ecec4aeb...&cid=1F7F5C37636A6CA0
      // We need to get the item ID from the URL
      
      let itemId = null;
      if (shareUrl.includes('onedrive.live.com')) {
        const urlObj = new URL(shareUrl);
        const idParam = urlObj.searchParams.get('id');
        if (idParam) {
          // URL decode the ID - it's the driveItem ID
          itemId = decodeURIComponent(idParam);
        }
      }

      const graphClient = this.createGraphClient(accessToken);
      
      let apiUrl;
      if (itemId) {
        apiUrl = `/me/drive/items/${itemId}/children`;
      } else {
        // Fallback: try to use the path from URL
        const pathMatch = shareUrl.match(/\/Documents\/(.+?)(?:\?|$)/);
        if (pathMatch) {
          const folderPath = decodeURIComponent(pathMatch[1]);
          apiUrl = `/me/drive/root:/${folderPath}:/children`;
        } else {
          throw new Error('Could not extract folder path from URL: ' + shareUrl);
        }
      }

      console.log('[OneDrive] Fetching files from:', apiUrl);
      
      const response = await graphClient.api(apiUrl).get();

      return response.value.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        lastModified: new Date(file.lastModifiedDateTime),
        mimeType: file.file?.mimeType || 'application/octet-stream',
        webUrl: file.webUrl,
        downloadUrl: file['@microsoft.graph.downloadUrl'],
        isPreviewable: this.isFilePreviewable(file.file?.mimeType)
      }));
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  }

  async getPublicFileThumbnails(shareUrl, fileId) {
    try {
      const apiUrl = this.convertShareUrlToApiUrl(shareUrl);
      
      const response = await fetch(`${apiUrl}/items/${fileId}/thumbnails`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch thumbnail: ${response.status}`);
      }

      const data = await response.json();
      
      // Return the medium size thumbnail URL if available
      if (data.value && data.value.length > 0) {
        const thumbnail = data.value[0];
        return thumbnail.medium?.url || thumbnail.small?.url || thumbnail.large?.url;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      return null; // Don't fail the whole operation for missing thumbnails
    }
  }

  async getPublicFileContent(shareUrl, fileId, maxSize = 10 * 1024 * 1024) {
    try {
      const apiUrl = this.convertShareUrlToApiUrl(shareUrl);
      
      // First get file info to check size
      const fileInfoResponse = await fetch(`${apiUrl}/items/${fileId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!fileInfoResponse.ok) {
        throw new Error(`Failed to fetch file info: ${fileInfoResponse.status}`);
      }

      const fileInfo = await fileInfoResponse.json();
      
      if (fileInfo.size > maxSize) {
        throw new Error(`File too large: ${fileInfo.size} bytes (max: ${maxSize})`);
      }

      // Get file content
      const contentResponse = await fetch(`${apiUrl}/items/${fileId}/content`, {
        headers: {
          'Accept': 'application/octet-stream'
        }
      });

      if (!contentResponse.ok) {
        throw new Error(`Failed to fetch file content: ${contentResponse.status}`);
      }

      return await contentResponse.arrayBuffer();
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  }

  convertShareUrlToApiUrl(shareUrl) {
    // Convert OneDrive share URL to Graph API URL
    // Example: https://1drv.ms/f/s!... -> https://graph.microsoft.com/v1.0/shares/{encoded-url}/root
    try {
      const encodedUrl = Buffer.from(shareUrl).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      return `https://graph.microsoft.com/v1.0/shares/u!${encodedUrl}/root`;
    } catch (error) {
      throw new Error(`Invalid share URL: ${shareUrl}`);
    }
  }

  isFilePreviewable(mimeType) {
    if (!mimeType) return false;
    
    const previewableTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    return previewableTypes.includes(mimeType.toLowerCase());
  }

  sanitizeFolderName(name) {
    if (!name) return 'Untitled';
    
    // Remove or replace invalid characters for OneDrive folder names
    return name
      .replace(/[<>:"/\\|?*]/g, '-')  // Replace invalid chars with dash
      .replace(/[#%&{}+~]/g, '-')     // Replace additional problematic chars
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\.+$/g, '')           // Remove trailing dots
      .trim()                         // Remove leading/trailing spaces
      .substring(0, 200);             // Limit length (leave room for path)
  }
}

module.exports = MicrosoftGraphService;