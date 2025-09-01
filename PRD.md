# Product Requirements Document: SurveyDisco.ai

## Executive Summary

SurveyDisco.ai is an email-driven workflow management system for surveying businesses that automates project intake, tracking, and deliverable management through email processing and team collaboration.

## Problem Statement

Surveying businesses receive project requests via email containing:
- Survey requests for properties
- Address lookup requests with quotes needed
- Parcel legal description checks
- Various surveying service inquiries

Current pain points:
- Manual email processing and data extraction
- No standardized project tracking system
- Difficulty managing project pipeline stages
- Team coordination challenges
- Manual deliverable tracking (estimates, PDFs, DWGs, invoices)

## Target Users

**Primary:** Your surveying team
**Secondary:** Clients (future consideration)

## Core Features

### 1. Email Integration & Processing
- Auto-pull emails from designated inbox
- Parse and extract project details
- Store standardized project information
- Identify request type (survey, quote, legal description, etc.)

### 2. Project Pipeline Management
- Project cards with standardized workflow stages:
  - Incoming request
  - Quote prepared
  - Estimate sent
  - PDF delivered
  - DWG delivered
  - Invoice sent
  - Project complete/canceled

### 3. Team Collaboration
- Team members can view all project statuses
- Update project stages via email
- Real-time project board updates
- Assignment and notification system

### 4. Data Management
- Centralized project database
- Address and parcel information storage
- Client contact management
- Project history tracking

### 5. Automation Features
- Auto-generate quotes based on project type
- Template management for estimates/invoices
- File organization and storage
- Progress tracking and reminders

## Technical Requirements

### Frontend
- **Framework:** React
- **Deployment:** Google Cloud Run
- **Authentication:** Supabase Auth with Google OAuth

### Backend
- **Runtime:** Node.js/Express
- **Database:** Supabase (PostgreSQL)
- **Email Processing:** Gmail API
- **File Storage:** Google Drive API or Supabase Storage

### Integrations
- Supabase Auth with Google OAuth (authentication)
- Gmail API (email processing)
- Google Drive API or Supabase Storage (document storage)
- Address/parcel lookup services (TBD)

## User Workflows

### Primary Workflow: Email-to-Project
1. Client sends email request
2. System auto-processes email
3. Creates project card with extracted data
4. Team member reviews and initiates workflow
5. System tracks progress through pipeline stages
6. Automated notifications for stage completions

### Secondary Workflow: Team Updates
1. Team member sends update email
2. System processes update
3. Project card status updated
4. Team notified of changes
5. Client notifications (if configured)

## Success Metrics

- Email processing accuracy (>95%)
- Time reduction in project setup (target: 80% reduction)
- Project pipeline visibility (100% of active projects tracked)
- Team adoption rate (100% of team members using system)
- Client response time improvement

## Technical Architecture

### Email Processing Pipeline
1. Gmail API monitors designated inbox
2. Email parser extracts structured data
3. Machine learning classifies request types
4. Database stores standardized project data
5. Project card created in management system

### Project Management System
1. Kanban-style board interface
2. Real-time updates via WebSocket connections
3. Email-triggered state changes
4. Automated workflow progression
5. File attachment handling

## Security & Compliance

- Google OAuth for secure authentication
- Encrypted data storage
- Email processing audit logs
- Client data privacy protection
- Secure file storage and sharing

## Development Phases

### Phase 1: Core Email Processing
- Gmail API integration
- Basic email parsing
- Project card creation
- Simple status tracking

### Phase 2: Team Collaboration
- Multi-user authentication
- Project assignment system
- Email-based status updates
- Real-time board updates

### Phase 3: Automation & Intelligence
- Smart email classification
- Auto-quote generation
- Template management
- Advanced reporting

### Phase 4: Client Portal (Future)
- Client access to project status
- Direct client communication
- Online quote approval
- Payment processing

## Dependencies

- Gmail API access and configuration
- Google Cloud Platform setup
- PostgreSQL database hosting
- SSL certificates for secure communication
- Domain configuration for email processing

## Risks & Mitigations

**Risk:** Email parsing accuracy
**Mitigation:** Machine learning training, manual review queue

**Risk:** Gmail API rate limits
**Mitigation:** Batch processing, queue management

**Risk:** Team adoption
**Mitigation:** Simple interface, gradual rollout, training

**Risk:** Data loss
**Mitigation:** Automated backups, database replication

## Future Considerations

- Mobile app for field updates
- Integration with accounting software
- Advanced analytics and reporting
- AI-powered project estimation
- Client self-service portal
- Integration with surveying equipment/software
