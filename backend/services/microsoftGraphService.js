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
      scopes: ['Files.ReadWrite'],
      redirectUri: this.redirectUri,
    };

    const response = await this.msalClient.acquireTokenByCode(tokenRequest);
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