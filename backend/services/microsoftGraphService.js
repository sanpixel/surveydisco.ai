const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientCredentialProvider } = require('@azure/msal-node');

class MicrosoftGraphService {
  constructor() {
    this.clientId = process.env.MICROSOFT_CLIENT_ID;
    this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    this.tenantId = process.env.MICROSOFT_TENANT_ID;
    
    if (!this.clientId || !this.clientSecret || !this.tenantId) {
      console.error('Microsoft Graph credentials missing from environment variables');
      this.graphClient = null;
      return;
    }

    try {
      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`
      };

      this.graphClient = Client.init({
        authProvider: async (done) => {
          try {
            const response = await fetch(`https://login.microsoftonline.com/consumers/oauth2/v2.0/token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: 'https://graph.microsoft.com/.default',
                grant_type: 'client_credentials'
              })
            });
            
            const tokenData = await response.json();
            console.log('OAuth response:', response.status, tokenData);
            
            if (response.ok && tokenData.access_token) {
              done(null, tokenData.access_token);
            } else {
              console.error('OAuth failed:', tokenData.error_description || tokenData.error);
              done(new Error(`Authentication failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`), null);
            }
          } catch (error) {
            done(error, null);
          }
        }
      });
    } catch (error) {
      console.error('Failed to initialize Microsoft Graph client:', error);
      this.graphClient = null;
    }
  }

  async createFolder(folderPath) {
    if (!this.graphClient) {
      throw new Error('Microsoft Graph client not initialized');
    }

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
          const existingFolder = await this.graphClient.api(`/drives/me/root:/${currentPath}`).get();
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
            
            const newFolder = await this.graphClient
              .api(`/drives/me/root:/${parentPath}:/children`)
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

  async getFolderWebUrl(folderPath) {
    if (!this.graphClient) {
      throw new Error('Microsoft Graph client not initialized');
    }

    try {
      console.log('Getting web URL for folder:', folderPath);
      const response = await this.graphClient
        .api(`/drives/me/root:/${folderPath}`)
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