# SurveyDisco.ai TODO

## High Priority

- [ ] AutoCAD Integration Enhancements
  - Add additional fields to project cards for surveying data:
    - [ ] `land_lot` - Land lot number
    - [ ] `district` - District information  
    - [ ] `county` - County name
    - [ ] `deed_book` - Reference deed book number
    - [ ] `deed_page` - Reference deed page number
  - [ ] Implement card flip/toggle functionality to show additional fields without cluttering main view
  - [ ] Update AutoCAD LISP endpoint to include new fields in pipe-delimited response
  - [ ] Update database schema to store new surveying fields
  - [ ] Design compact UI for additional fields (flip card, expandable section, or modal)
  - [ ] Integrate MAPMAP LISP functionality:
    - [ ] Add vicinity map block attribute to SS_BLOCK_11X17
    - [ ] Create endpoint to generate Google Maps vicinity map from geoAddress
    - [ ] Add "SITE" arrow/marker overlay to map image before placing in drawing
    - [ ] Update FILLPROJ LISP to pull map data and insert into block
    - [ ] Handle map image embedding or reference in AutoCAD drawing

## High Priority
- [ ] OneDrive integration for file storage and management
  - Set up Microsoft Graph API access for OneDrive
  - Create project folders automatically in OneDrive
  - Upload and organize survey documents, photos, and reports
  - Link OneDrive files to project cards
  - Sync project status with file organization

- [ ] Monitor email address for auto-updating projects
  - Set up email monitoring service (IMAP/POP3 or webhook)
  - Parse incoming emails for project information
  - Automatically create new projects from email content
  - Send confirmation emails back to clients

### OneDrive Integration Detailed Steps

#### Phase 1: Microsoft Graph API Setup
- [ ] Register app in Azure Active Directory (Microsoft Entra ID)
- [ ] Configure API permissions for OneDrive access:
  - [ ] `Files.ReadWrite` - Read and write user files
  - [ ] `Files.ReadWrite.All` - Read and write all files (if needed for shared drives)
- [ ] Set up OAuth 2.0 authentication flow
- [ ] Install Microsoft Graph SDK (`npm install @azure/msal-node @microsoft/microsoft-graph-client`)
- [ ] Configure redirect URIs and client secrets

#### Phase 2: Authentication & Authorization
- [ ] Implement OAuth login flow for OneDrive access
- [ ] Store refresh tokens securely in database
- [ ] Add user authentication state management
- [ ] Handle token refresh automatically
- [ ] Add OneDrive connection status to user settings

#### Phase 3: Project Folder Management
- [ ] Work with existing OneDrive structure:
  - [ ] Base path: `/surveydisco/` (existing main directory)
  - [ ] Create project folders: `/surveydisco/{sanitized_geoaddress}/` where geoaddress = geo_address || address
  - [ ] Sanitize folder names: replace commas, slashes, and special chars with dashes or underscores
  - [ ] Simple flat structure - no subfolders, just files directly in project folder
  - [ ] Example: "123 Main St, Atlanta, GA" → "123-Main-St-Atlanta-GA"
- [ ] Link OneDrive folder to project record in database
- [ ] Add OneDrive folder URL to project cards
- [ ] Sync folder creation when new projects are added

#### Phase 4: File Upload & Organization
- [ ] Drag-and-drop file upload interface on project cards
- [ ] Simple file storage - all files go directly into project folder
- [ ] File naming convention: `{jobNumber}_{filename}` to avoid conflicts
- [ ] File preview and download links in project interface
- [ ] Basic file operations (upload, download, delete)

#### Phase 5: Database Schema Updates
- [ ] Add OneDrive fields to `surveydisco_projects` table:
  - [ ] `onedrive_folder_id` VARCHAR(255) - OneDrive folder ID
  - [ ] `onedrive_folder_url` TEXT - Direct link to project folder
  - [ ] `onedrive_sync_status` ENUM('pending', 'synced', 'error')
  - [ ] `onedrive_last_sync` TIMESTAMP
- [ ] Create `project_files` table:
  - [ ] `id` SERIAL PRIMARY KEY
  - [ ] `project_id` INTEGER (FK to surveydisco_projects)
  - [ ] `onedrive_file_id` VARCHAR(255)
  - [ ] `file_name` VARCHAR(255)
  - [ ] `file_type` VARCHAR(50)
  - [ ] `file_size` BIGINT
  - [ ] `upload_date` TIMESTAMP
  - [ ] `file_category` ENUM('document', 'photo', 'report', 'correspondence', 'other')

#### Phase 6: File Management Interface
- [ ] Add "Files" section to project cards
- [ ] Display file count and total size per project
- [ ] File list with preview thumbnails
- [ ] Upload progress indicators
- [ ] File sharing and permission management
- [ ] Search files across all projects

#### Phase 7: Advanced Features
- [ ] Automatic file backup and versioning
- [ ] File templates for common survey documents
- [ ] OCR text extraction from uploaded images/PDFs
- [ ] Integration with email attachments (auto-save to OneDrive)
- [ ] Mobile photo upload from field work
- [ ] Collaborative editing for shared documents

### Gmail Integration Detailed Steps

#### Phase 1: Gmail API Setup
- [ ] Enable Gmail API in Google Cloud Console
- [ ] Create service account credentials for Gmail access
- [ ] Download and configure credentials JSON file
- [ ] Add Gmail API scopes for reading emails (`https://www.googleapis.com/auth/gmail.readonly`)
- [ ] Install googleapis npm package (`npm install googleapis`)

#### Phase 2: Email Monitoring Strategy
- [ ] Choose monitoring approach:
  - [ ] Gmail Push Notifications (Pub/Sub) - real-time option
  - [ ] Polling approach - check every 5-15 minutes
- [ ] Set up email filters:
  - [ ] Filter by specific sender addresses (survey request sources)
  - [ ] Filter by subject keywords ("survey", "quote", "boundary", etc.)
  - [ ] Filter by email content keywords
- [ ] Implement duplicate prevention system:
  - [ ] Track processed email IDs in database
  - [ ] Add `processed_emails` table with email_id, processed_date, project_id

#### Phase 3: Email Processing Pipeline
- [ ] Create email monitoring service (`/services/emailMonitor.js`)
- [ ] Email text extraction:
  - [ ] Parse HTML email content to plain text
  - [ ] Handle multipart emails (HTML + plain text)
  - [ ] Extract relevant content (ignore signatures, headers)
- [ ] Integration with existing parsing:
  - [ ] Feed extracted email text into `parseProjectText` function
  - [ ] Add email metadata to project creation
- [ ] Handle attachments:
  - [ ] Download and store PDFs, images
  - [ ] Extract text from PDF attachments if needed
  - [ ] Link attachments to created projects

#### Phase 4: Database Schema Updates
- [ ] Add email-related fields to `surveydisco_projects` table:
  - [ ] `email_source` VARCHAR(255) - original sender email
  - [ ] `email_subject` TEXT - original email subject
  - [ ] `email_date` TIMESTAMP - when email was received
  - [ ] `gmail_message_id` VARCHAR(255) - Gmail message ID for reference
- [ ] Create `processed_emails` table:
  - [ ] `id` SERIAL PRIMARY KEY
  - [ ] `gmail_message_id` VARCHAR(255) UNIQUE
  - [ ] `processed_date` TIMESTAMP
  - [ ] `project_id` INTEGER (FK to surveydisco_projects)
  - [ ] `processing_status` ENUM('success', 'failed', 'manual_review')

#### Phase 5: Auto-Response System
- [ ] Send confirmation emails:
  - [ ] Template for successful project creation
  - [ ] Include project number and basic details
  - [ ] Professional survey company branding
- [ ] Handle failed processing:
  - [ ] Send "received, under review" response
  - [ ] Queue for manual processing
  - [ ] Admin notification system

#### Phase 6: Error Handling & Monitoring
- [ ] Failed parsing scenarios:
  - [ ] Create manual review queue in admin interface
  - [ ] Log parsing failures with original email content
  - [ ] Retry mechanism for temporary failures
- [ ] Invalid/spam email handling:
  - [ ] Implement email validation rules
  - [ ] Spam detection and filtering
  - [ ] Blacklist management
- [ ] API rate limit management:
  - [ ] Gmail API quota monitoring
  - [ ] Queue management for high volume
  - [ ] Exponential backoff for rate limits

#### Phase 7: Admin Interface
- [ ] Email processing dashboard:
  - [ ] View processed emails list
  - [ ] Manual review queue interface
  - [ ] Processing statistics and metrics
- [ ] Configuration settings:
  - [ ] Enable/disable auto-processing
  - [ ] Email filter configuration
  - [ ] Response template management

- [ ] Address validation enhancement:
  - [ ] Auto-validate address when field is updated
  - [ ] Trigger Google Maps API on address edit
  - [ ] Update geo_address and recalculate travel time automatically
  - [ ] Add validation status indicator in UI

- [ ] UI improvements:
  - [ ] Fix project card layout - keep buttons anchored at bottom
  - [ ] Use CSS flexbox to push buttons to bottom regardless of field content
  - [ ] Ensure consistent card height or flexible bottom positioning

- [ ] Expand status tags system:
  - [ ] Keep main status field (New, Regex) but add multiple tags
  - [ ] Add "Tags" button at bottom of cards to manage additional tags
  - [ ] Additional tag options: Done, Callback, Review, Quote, Survey, Field, Draft, Billed, Hold, Rush
  - [ ] Color scheme (no red): 
    - Done: Green, Callback: Orange, Review: Purple, Quote: Teal
    - Survey: Indigo, Field: Brown, Draft: Gray, Billed: Gold
    - Hold: Silver, Rush: Pink
  - [ ] Display tags as small badges next to main status
  - [ ] Allow multiple tags per project (e.g., "New" + "Rush" + "Quote")
  - [ ] Add tag filtering/sorting options

## Medium Priority
- [ ] Enhanced travel time features
  - Add different travel modes (walking, transit, etc.)
  - Show route preview/map integration
  - Historical travel time tracking
  - Rush hour vs off-peak time comparisons

- [ ] Project management improvements
  - Project status workflow (New → In Progress → Complete → Billed)
  - Due date tracking and notifications
  - Project templates for common survey types
  - Bulk operations (status updates, exports)

- [ ] Client communication
  - Email templates for different project phases
  - Automated status update emails
  - SMS notifications for urgent updates
  - Client portal for project tracking

## Low Priority
- [ ] Reporting and analytics
  - Monthly project summary reports
  - Travel time and distance analytics
  - Revenue tracking and projections
  - Client frequency analysis

- [ ] Mobile optimization
  - Responsive design improvements
  - Touch-friendly interactions
  - Offline capability for field work
  - GPS integration for current location

- [ ] Integration enhancements
  - Export to QuickBooks for invoicing
  - Calendar integration for scheduling
  - Google Drive/Dropbox for file storage
  - CRM system integration

- [ ] Advanced features
  - Project cost calculator based on survey type
  - Weather integration for field work planning
  - Equipment tracking and maintenance
  - Staff assignment and workload management

## Completed ✅
- [x] Google Routes API integration for travel time calculations
- [x] Traffic-aware routing with real-time estimates
- [x] Clickable travel info refresh functionality
- [x] Express version downgrade fix (v5 → v4)
- [x] Regrid integration with clipboard copy
- [x] Address validation with Google Maps Geocoding
- [x] Database schema updates for travel data
- [x] GitHub Actions deployment to Cloud Run
- [x] Environment variable management
- [x] Basic project parsing and CRUD operations
