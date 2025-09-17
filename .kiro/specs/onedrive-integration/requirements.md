# Requirements Document

## Introduction

This feature adds a simple OneDrive integration to SurveyDisco.ai, enabling users to access the specific OneDrive folder associated with each project card. Users will be able to open the project's OneDrive folder directly from the project card interface.

## Requirements

### Requirement 1

**User Story:** As a surveyor, I want to click a button on each project card to open that project's OneDrive folder, so that I can access all files related to that specific project.

#### Acceptance Criteria

1. WHEN a user clicks "OpenFolder" on a project card THEN the system SHALL open the specific OneDrive folder for that project in a new browser tab
2. WHEN the OneDrive folder doesn't exist THEN the system SHALL display an error message indicating the folder was not found, this folder will exist because this app will create the folder when it sets the address
3. WHEN the user is not authenticated with Microsoft THEN the system SHALL redirect to Microsoft login first, no user logon required, KEYS connect to system in backend
4. IF the OneDrive service is unavailable THEN the system SHALL display an appropriate error message

### Requirement 2

**User Story:** As a surveyor, I want each project to have a consistent OneDrive folder structure, so that I can easily find project files using a predictable naming convention.

#### Acceptance Criteria

2. WHEN generating the folder path THEN the system SHALL use the format "Surveydisco/[geoaddress]" fallback with address
3. WHEN the client name contains special characters THEN the system SHALL sanitize them for folder naming

### Requirement 3

**User Story:** As a developer, I want to deploy the OneDrive integration using GitHub Actions, so that Microsoft API credentials are securely managed and the application deploys automatically.

#### Acceptance Criteria

1. WHEN code is pushed to the repository THEN GitHub Actions SHALL automatically deploy the application
2. WHEN deployment occurs THEN the system SHALL use Microsoft API secrets from GitHub repository secrets
3. WHEN setting up deployment THEN the system SHALL read Microsoft credentials from c:\dev\begin.env file and using gh cli to update the repo
4. WHEN the application starts THEN the system SHALL load Microsoft Graph API credentials from environment variables
5. IF Microsoft credentials are missing THEN the system SHALL log an error and disable OneDrive features