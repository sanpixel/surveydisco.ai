# SurveyDisco.ai TODO

## High Priority
- [ ] Monitor email address for auto-updating projects
  - Set up email monitoring service (IMAP/POP3 or webhook)
  - Parse incoming emails for project information
  - Automatically create new projects from email content
  - Send confirmation emails back to clients

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
