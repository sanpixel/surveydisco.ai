# Design Document

## Overview

The OneDrive integration will add a simple "Open Folder" button to each project card that opens the corresponding OneDrive folder in a new browser tab. The system will use Microsoft Graph API with application-level authentication to create folders and generate shareable URLs for direct browser access.

nothing will every be removed from onedrive by this application, only create folders and view files

## Architecture

### High-Level Flow
1. User clicks "Open Folder" button on project card
2. Frontend sends request to backend with project details
3. Backend authenticates with Microsoft Graph API using stored credentials
4. Backend creates OneDrive folder if it doesn't exist (never using job number, it's going to use /Surveydisco/[geoaddress] (from the card, with address fallback)
5. Backend returns OneDrive web URL for the folder
6. Frontend opens URL in new browser tab

### Authentication Strategy
- **Application-level authentication** using Microsoft Graph API with client credentials flow
- No user authentication required - system acts on behalf of the organization
- Credentials stored as environment variables and GitHub secrets

## Components and Interfaces

### Frontend Components

#### ProjectCard Component Updates
```javascript
// Add OneDrive button to existing project card
<button 
  className="onedrive-button"
  onClick={() => openOneDriveFolder(project)}
>
  📁 Open Folder
</button>
```

#### OneDrive Service
```javascript
// frontend/src/services/onedriveService.js
export const openOneDriveFolder = async (project) => {
  try {
    const response = await fetch('/api/onedrive/folder-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobNumber: project.job_number,
        clientName: project.client_name,
        geoAddress: project.geo_address,
        projectId: project.id
      })
    });
    
    const { folderUrl } = await response.json();
    window.open(folderUrl, '_blank');
  } catch (error) {
    console.error('Failed to open OneDrive folder:', error);
    alert('Unable to open OneDrive folder');
  }
};
```

### Backend Components

#### OneDrive Controller
```javascript
// backend/controllers/onedriveController.js
const { Client } = require('@microsoft/microsoft-graph-client');

class OneDriveController {
  async getFolderUrl(req, res) {
    const { jobNumber, clientName, geoAddress, projectId } = req.body;
    
    try {
      const folderName = this.sanitizeFolderName(project.geo_address || `${jobNumber} - ${clientName}`);
      const folderPath = `_SurveyDisco/${folderName}`;
      
      // Create folder if it doesn't exist
      await this.ensureFolderExists(folderPath);
      
      // Generate shareable URL
      const folderUrl = await this.getFolderWebUrl(folderPath);
      
      res.json({ folderUrl });
    } catch (error) {
      res.status(500).json({ error: 'Failed to access OneDrive folder' });
    }
  }
}
```

#### Microsoft Graph Service
```javascript
// backend/services/microsoftGraphService.js
const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientCredentialProvider } = require('@microsoft/microsoft-graph-client');

class MicrosoftGraphService {
  constructor() {
    this.graphClient = Client.initWithMiddleware({
      authProvider: new ClientCredentialProvider({
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        tenantId: process.env.MICROSOFT_TENANT_ID
      })
    });
  }

  async createFolder(folderPath) {
    // Implementation for creating OneDrive folder
  }

  async getFolderWebUrl(folderPath) {
    // Implementation for getting shareable folder URL
  }
}
```

## Data Models

### Environment Variables
```bash
# Microsoft Graph API credentials
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret  
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_ONEDRIVE_ROOT_FOLDER_ID=_SurveyDisco
```

### API Request/Response Models

#### Folder URL Request
```json
{
  "jobNumber": "250901",
  "clientName": "John Smith",
  "geoAddress": "123 Main St, Anytown CA",
  "projectId": 123
}
```

#### Folder URL Response
```json
{
  "folderUrl": "https://company-my.sharepoint.com/personal/user/Documents/_SurveyDisco/123%20Main%20St%20Anytown%20CA"
}
```

### Database Schema Updates
No database changes required - folder structure is determined dynamically from existing project data.

## Error Handling

### Frontend Error Handling
- Network errors: Display user-friendly message
- Invalid responses: Log error and show generic message
- Popup blockers: Inform user to allow popups

### Backend Error Handling
- Authentication failures: Log error, return 500 status
- Folder creation failures: Retry once, then return error
- Invalid folder names: Sanitize and retry
- Rate limiting: Implement exponential backoff

### Error Messages
- "Unable to open OneDrive folder. Please try again."
- "OneDrive service temporarily unavailable."
- "Project folder could not be created."

## Testing Strategy

### Unit Tests
- Folder name sanitization logic
- URL generation functions
- Error handling scenarios
- Microsoft Graph API service methods

### Integration Tests
- End-to-end folder creation and URL generation
- Authentication flow with Microsoft Graph
- Error scenarios (network failures, invalid credentials)

### Manual Testing
- Test with various project names and special characters
- Verify folder creation in OneDrive
- Test URL opening in different browsers
- Verify error handling with invalid credentials

## Security Considerations

### Credential Management
- Store Microsoft API credentials as environment variables
- Use GitHub secrets for deployment
- Never expose credentials in frontend code
- Rotate credentials regularly

### Access Control
- Application-level permissions only (no user data access)
- Limit OneDrive access to specific folder structure
- Validate and sanitize all folder names
- Rate limiting to prevent API abuse

## Deployment Configuration

### GitHub Actions Secrets
```bash
# Set these secrets in GitHub repository
MICROSOFT_CLIENT_ID
MICROSOFT_CLIENT_SECRET
MICROSOFT_TENANT_ID
MICROSOFT_ONEDRIVE_ROOT_FOLDER_ID
```

### Environment Setup Script
```bash
# Read from c:\dev\begin.env and set GitHub secrets
gh secret set MICROSOFT_CLIENT_ID --body "$(grep MICROSOFT_CLIENT_ID c:/dev/begin.env | cut -d'=' -f2)"
gh secret set MICROSOFT_CLIENT_SECRET --body "$(grep MICROSOFT_CLIENT_SECRET c:/dev/begin.env | cut -d'=' -f2)"
gh secret set MICROSOFT_TENANT_ID --body "$(grep MICROSOFT_TENANT_ID c:/dev/begin.env | cut -d'=' -f2)"
```