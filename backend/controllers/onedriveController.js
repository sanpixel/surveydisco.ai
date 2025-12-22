const MicrosoftGraphService = require('../services/microsoftGraphService');
const { Pool } = require('pg');

class OneDriveController {
  constructor() {
    this.graphService = new MicrosoftGraphService();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }

  async getFolderUrl(req, res) {
    try {
      const { jobNumber, clientName, geoAddress, projectId } = req.body;

      if (!jobNumber && !clientName && !geoAddress && !projectId) {
        return res.status(400).json({ error: 'Project information required' });
      }

      // Use job number first, then add address or client info
      let folderName;
      if (jobNumber && geoAddress && geoAddress.trim()) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - ${geoAddress}`);
        console.log('Using job number + geo address for folder name:', folderName);
      } else if (jobNumber && clientName) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - ${clientName}`);
        console.log('Using job number + client name for folder name:', folderName);
      } else if (jobNumber) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - Project`);
        console.log('Using job number only for folder name:', folderName);
      } else {
        folderName = this.graphService.sanitizeFolderName(`Project-${projectId}`);
        console.log('Using project ID for folder name:', folderName);
      }

      const folderPath = `_SurveyDisco/${folderName}`;
      console.log('Creating OneDrive folder at path:', folderPath);

      // Check if user is authenticated (has access token in session/cookie)
      const accessToken = req.session?.accessToken || req.cookies?.onedrive_token;

      if (!accessToken) {
        // Redirect to OAuth login
        const authUrl = await this.graphService.getAuthUrl();

        // Store project info in session for after auth
        req.session = req.session || {};
        req.session.pendingProject = { jobNumber, clientName, geoAddress, projectId };

        return res.json({ authUrl, requiresAuth: true });
      }

      // Create folder if it doesn't exist (never delete existing folders)
      await this.graphService.createFolder(folderPath, accessToken);

      // Get shareable URL
      const folderUrl = await this.graphService.getFolderWebUrl(folderPath, accessToken);
      console.log('Generated OneDrive folder URL:', folderUrl);

      res.json({ folderUrl });
    } catch (error) {
      console.error('OneDrive folder access error:', error);

      if (error.message.includes('not initialized')) {
        return res.status(500).json({
          error: 'OneDrive service unavailable - missing credentials'
        });
      }

      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        return res.status(500).json({
          error: 'OneDrive authentication failed - please try again later'
        });
      }

      res.status(500).json({
        error: 'Failed to access OneDrive folder'
      });
    }
  }

  async handleCallback(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code required' });
      }

      // Exchange code for access token
      const accessToken = await this.graphService.getTokenFromCode(code);

      // Store token in session/cookie
      req.session = req.session || {};
      req.session.accessToken = accessToken;

      // Set cookie for future requests
      res.cookie('onedrive_token', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3600000 // 1 hour
      });

      // Redirect back to frontend with success
      res.redirect(`${process.env.CLOUD_RUN_URL || 'http://localhost:3000'}?onedrive_auth=success`);
    } catch (error) {
      console.error('OneDrive callback error:', error);
      res.redirect(`${process.env.CLOUD_RUN_URL || 'http://localhost:3000'}?onedrive_auth=error`);
    }
  }

  async initFolder(req, res) {
    try {
      const { jobNumber, clientName, geoAddress, projectId } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
      }

      console.log('Initializing OneDrive folder for project:', projectId, 'Job:', jobNumber);

      const accessToken = req.session?.accessToken || req.cookies?.onedrive_token;
      
      if (!accessToken) {
        // Redirect to OAuth login
        const authUrl = await this.graphService.getAuthUrl();
        req.session = req.session || {};
        req.session.pendingProject = { jobNumber, clientName, geoAddress, projectId };
        return res.json({ authUrl, requiresAuth: true });
      }

      // Generate folder name and path (same logic as getFolderUrl)
      let folderName;
      if (jobNumber && geoAddress && geoAddress.trim()) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - ${geoAddress}`);
      } else if (jobNumber && clientName) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - ${clientName}`);
      } else if (jobNumber) {
        folderName = this.graphService.sanitizeFolderName(`${jobNumber} - Project`);
      } else {
        folderName = this.graphService.sanitizeFolderName(`Project-${projectId}`);
      }

      const folderPath = `_SurveyDisco/${folderName}`;

      // Check if folder already exists
      const folderExists = await this.graphService.checkFolderExists(folderPath, accessToken);
      
      let templateCopied = false;
      let folderUrl;

      if (folderExists) {
        console.log('OneDrive folder already exists, skipping template creation:', folderPath);
        // Get existing folder URL
        folderUrl = await this.graphService.getFolderWebUrl(folderPath, accessToken);
      } else {
        console.log('Creating new OneDrive folder:', folderPath);
        // Create folder
        await this.graphService.createFolder(folderPath, accessToken);
        
        // Get folder URL
        folderUrl = await this.graphService.getFolderWebUrl(folderPath, accessToken);
        
        // Copy template file to new folder
        try {
          const templateFileName = this.generateTemplateFileName(jobNumber, geoAddress);
          await this.copyTemplateFile(folderPath, templateFileName, accessToken);
          templateCopied = true;
          console.log('Template file copied successfully:', templateFileName);
        } catch (templateError) {
          console.error('Failed to copy template file (continuing anyway):', templateError);
          // Don't fail the whole operation if template copy fails
        }
      }

      // Store the URL in the database
      await this.pool.query(
        'UPDATE surveydisco_projects SET onedrive_folder_url = $1 WHERE id = $2',
        [folderUrl, projectId]
      );

      console.log('Successfully initialized OneDrive folder for project:', projectId);

      res.json({ 
        success: true, 
        folderUrl,
        folderExists: folderExists,
        templateCopied: templateCopied
      });
    } catch (error) {
      console.error('OneDrive folder initialization error:', error);

      if (error.message.includes('not initialized')) {
        return res.status(500).json({
          error: 'OneDrive service unavailable - missing credentials'
        });
      }

      if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
        return res.status(500).json({
          error: 'OneDrive authentication failed - please try again later'
        });
      }

      res.status(500).json({
        error: 'Failed to initialize OneDrive folder'
      });
    }
  }

  generateTemplateFileName(jobNumber, geoAddress) {
    // Extract street address (remove city, state, country)
    let streetAddress = '';
    if (geoAddress) {
      // Split by comma and take first part (street address)
      streetAddress = geoAddress.split(',')[0].trim();
    }
    
    // Generate filename: "250905 - 295 Creekview Trl.dwg"
    const fileName = streetAddress 
      ? `${jobNumber} - ${streetAddress}.dwg`
      : `${jobNumber} - Project.dwg`;
      
    // Sanitize filename
    return this.graphService.sanitizeFolderName(fileName);
  }

  async copyTemplateFile(folderPath, fileName, accessToken) {
    const templateUrl = 'https://1drv.ms/u/c/1f7f5c37636a6ca0/EVkDfwsTaZ5PmeFDSgPKYY8B3F1fbudTsLLHiSbINyG8Dg?e=Yqg5Kh';
    
    // Download template file from OneDrive
    const templateContent = await this.graphService.downloadFileFromUrl(templateUrl, accessToken);
    
    // Upload to project folder with new name
    await this.graphService.uploadFile(folderPath, fileName, templateContent, accessToken);
  }

  async getPublicFiles(req, res) {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: 'Project ID required' });
      }

      // Get project's OneDrive folder URL from database
      const result = await this.pool.query(
        'SELECT onedrive_folder_url FROM surveydisco_projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const folderUrl = result.rows[0].onedrive_folder_url;
      
      if (!folderUrl) {
        return res.json({ 
          files: [], 
          folderInitialized: false,
          message: 'OneDrive folder not initialized' 
        });
      }

      // Fetch files from public OneDrive share
      const files = await this.graphService.getPublicFiles(folderUrl);
      
      res.json({ 
        files, 
        folderInitialized: true,
        shareUrl: folderUrl 
      });
    } catch (error) {
      console.error('Error fetching public files:', error);
      
      if (error.message.includes('Invalid share URL')) {
        return res.status(400).json({ error: 'Invalid OneDrive share URL' });
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch files',
        details: error.message 
      });
    }
  }

  async getPublicThumbnails(req, res) {
    try {
      const { projectId } = req.params;
      const { fileId } = req.body;

      if (!projectId || !fileId) {
        return res.status(400).json({ error: 'Project ID and file ID required' });
      }

      // Get project's OneDrive folder URL from database
      const result = await this.pool.query(
        'SELECT onedrive_folder_url FROM surveydisco_projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const folderUrl = result.rows[0].onedrive_folder_url;
      
      if (!folderUrl) {
        return res.status(404).json({ error: 'OneDrive folder not initialized' });
      }

      // Fetch thumbnail from public OneDrive share
      const thumbnailUrl = await this.graphService.getPublicFileThumbnails(folderUrl, fileId);
      
      res.json({ thumbnailUrl });
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      res.status(500).json({ 
        error: 'Failed to fetch thumbnail',
        details: error.message 
      });
    }
  }

  async getPublicFileContent(req, res) {
    try {
      const { projectId, fileId } = req.params;
      const maxSize = req.query.maxSize ? parseInt(req.query.maxSize) : 10 * 1024 * 1024; // 10MB default

      if (!projectId || !fileId) {
        return res.status(400).json({ error: 'Project ID and file ID required' });
      }

      // Get project's OneDrive folder URL from database
      const result = await this.pool.query(
        'SELECT onedrive_folder_url FROM surveydisco_projects WHERE id = $1',
        [projectId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }

      const folderUrl = result.rows[0].onedrive_folder_url;
      
      if (!folderUrl) {
        return res.status(404).json({ error: 'OneDrive folder not initialized' });
      }

      // Fetch file content from public OneDrive share
      const content = await this.graphService.getPublicFileContent(folderUrl, fileId, maxSize);
      
      // Set appropriate headers for file download/preview
      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': content.byteLength
      });
      
      res.send(Buffer.from(content));
    } catch (error) {
      console.error('Error fetching file content:', error);
      
      if (error.message.includes('File too large')) {
        return res.status(413).json({ error: error.message });
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch file content',
        details: error.message 
      });
    }
  }
}

module.exports = OneDriveController;