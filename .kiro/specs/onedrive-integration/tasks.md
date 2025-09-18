# Implementation Plan

- [ ] 1. Set up Microsoft Graph API dependencies and configuration


  - Install @microsoft/microsoft-graph-client package in backend
  - Add Microsoft Graph authentication configuration
  - Create environment variable structure for Microsoft credentials
  - _Requirements: 3.4, 3.5_

- [ ] 2. Create OneDrive service module


  - Implement MicrosoftGraphService class with client credentials authentication
  - Add folder creation method using Microsoft Graph API
  - Add folder URL generation method for web access
  - Write unit tests for OneDrive service methods
  - _Requirements: 1.1, 2.1, 2.2_

- [ ] 3. Implement backend API endpoint for folder access


  - Create OneDrive controller with getFolderUrl method
  - Add folder name sanitization logic for special characters
  - Implement error handling for Microsoft Graph API failures
  - Add API route for /api/onedrive/folder-url endpoint
  - _Requirements: 1.1, 1.4, 2.3_

- [ ] 4. Add OneDrive button to frontend project cards


  - Update ProjectCard component to include "Open Folder" button
  - Add CSS styling for OneDrive button integration
  - Implement click handler to call backend API
  - _Requirements: 1.1_

- [ ] 5. Create frontend OneDrive service


  - Implement openOneDriveFolder function to call backend API
  - Add error handling for network failures and API errors
  - Add user feedback for successful and failed folder operations
  - _Requirements: 1.1, 1.4_

- [ ] 6. Configure GitHub Actions deployment with Microsoft secrets


  - Update GitHub Actions workflow to include Microsoft environment variables
  - Create script to read credentials from c:\dev\begin.env using gh cli
  - Set up GitHub repository secrets for Microsoft API credentials
  - Test deployment with OneDrive integration enabled
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 7. Implement folder creation and URL generation logic


  - Add automatic folder creation when project folder doesn't exist
  - Implement folder naming using geo address with fallback to job number and client name
  - Add folder name sanitization for special characters
  - Test folder creation and URL generation with various project data
  - **IMPORTANT: Only create folders, never delete existing OneDrive content**
  - _Requirements: 2.2, 2.3_

- [x] 8. Add comprehensive error handling and user feedback




  - Implement frontend error messages for OneDrive failures
  - Add backend logging for Microsoft Graph API errors
  - Test error scenarios including network failures and authentication issues
  - Add user-friendly error messages for common failure cases
  - **IMPORTANT: Never delete OneDrive folders or files during testing - only create**
  - _Requirements: 1.4, 1.5_

- [x] 9. Commit and deploy OneDrive integration

  - Commit all OneDrive integration changes with detailed commit message
  - Push changes to trigger GitHub Actions deployment
  - Verify deployment includes Microsoft Graph API credentials
  - User will run manual test in the morning
  - _Requirements: 3.1, 3.2_