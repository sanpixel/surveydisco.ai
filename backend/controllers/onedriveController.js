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

      // Use the existing getFolderUrl logic to create folder and get URL
      const mockRes = {
        status: (code) => ({ json: (data) => ({ statusCode: code, data }) }),
        json: (data) => ({ statusCode: 200, data })
      };

      // Call the existing folder creation logic
      await this.getFolderUrl({ body: { jobNumber, clientName, geoAddress, projectId } }, mockRes);

      // If we got here without throwing, the folder was created successfully
      // Now we need to get the folder URL and store it in the database
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

      // Create folder if it doesn't exist
      await this.graphService.createFolder(folderPath, accessToken);

      // Get shareable URL
      const folderUrl = await this.graphService.getFolderWebUrl(folderPath, accessToken);

      // Store the URL in the database
      await this.pool.query(
        'UPDATE surveydisco_projects SET onedrive_folder_url = $1 WHERE id = $2',
        [folderUrl, projectId]
      );

      console.log('Successfully initialized OneDrive folder and stored URL for project:', projectId);

      res.json({ success: true, folderUrl });
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
}

module.exports = OneDriveController;