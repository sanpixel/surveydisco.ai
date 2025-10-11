const MicrosoftGraphService = require('../services/microsoftGraphService');

class OneDriveController {
  constructor() {
    this.graphService = new MicrosoftGraphService();
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
      
      // Create folder if it doesn't exist (never delete existing folders)
      await this.graphService.createFolder(folderPath);
      
      // Get shareable URL
      const folderUrl = await this.graphService.getFolderWebUrl(folderPath);
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
}

module.exports = OneDriveController;