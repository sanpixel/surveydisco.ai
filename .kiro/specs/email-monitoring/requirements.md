# Requirements Document

## Introduction

The email monitoring feature will automatically monitor a designated Gmail inbox for incoming project requests, parse the email content using the existing text parsing system, and create new projects automatically without manual intervention.

## Requirements

### Requirement 1

**User Story:** As a surveying business owner, I want the system to automatically monitor my business email inbox so that new project requests are captured immediately without manual data entry.

#### Acceptance Criteria

1. WHEN a new email arrives in the monitored inbox THEN the system SHALL retrieve and process the email within 5 minutes
2. WHEN the system processes an email THEN it SHALL extract the email content and feed it to the existing parseProjectText function
3. WHEN an email is successfully processed THEN the system SHALL mark the email as processed to prevent duplicate processing
4. WHEN the system encounters an authentication error THEN it SHALL log the error and continue monitoring without crashing

### Requirement 2

**User Story:** As a surveying business owner, I want the system to automatically create project cards from email content so that I don't have to manually copy and paste email information.

#### Acceptance Criteria

1. WHEN an email contains project information THEN the system SHALL create a new project using the existing project creation API
2. WHEN a project is created from email THEN it SHALL include the original email metadata (sender, subject, date)
3. WHEN project creation is successful THEN the system SHALL store the Gmail message ID to track the source
4. WHEN project creation fails THEN the system SHALL log the error and continue processing other emails

### Requirement 3

**User Story:** As a surveying business owner, I want the system to send automatic confirmation emails so that clients know their request was received and processed.

#### Acceptance Criteria

1. WHEN a project is successfully created from an email THEN the system SHALL send a confirmation email to the original sender
2. WHEN sending confirmation email THEN it SHALL include the generated job number and basic project details
3. WHEN confirmation email fails to send THEN the system SHALL log the error but not affect project creation
4. WHEN the original email is from a no-reply address THEN the system SHALL skip sending confirmation

### Requirement 4

**User Story:** As a system administrator, I want to configure which email address to monitor so that the system can work with different business email accounts.

#### Acceptance Criteria

1. WHEN configuring email monitoring THEN the system SHALL use environment variables for Gmail API credentials
2. WHEN configuring email monitoring THEN the system SHALL use environment variables to specify the monitored email address
3. WHEN Gmail API credentials are invalid THEN the system SHALL fail gracefully and log appropriate error messages
4. WHEN the monitored email address is not accessible THEN the system SHALL log the error and retry with exponential backoff

### Requirement 5

**User Story:** As a surveying business owner, I want the system to handle email attachments so that project documents are automatically stored with the project.

#### Acceptance Criteria

1. WHEN an email contains PDF attachments THEN the system SHALL download and store them in the project's OneDrive folder
2. WHEN an email contains image attachments THEN the system SHALL download and store them in the project's OneDrive folder
3. WHEN attachment download fails THEN the system SHALL log the error but continue processing the email
4. WHEN the OneDrive integration is not available THEN the system SHALL skip attachment processing and continue with project creation

### Requirement 6

**User Story:** As a system administrator, I want the email monitoring to run continuously so that no project requests are missed during business hours.

#### Acceptance Criteria

1. WHEN the system starts THEN it SHALL begin monitoring the configured email inbox automatically
2. WHEN the system encounters temporary Gmail API errors THEN it SHALL retry with exponential backoff up to 3 times
3. WHEN the system encounters rate limits THEN it SHALL respect the rate limit and resume monitoring when allowed
4. WHEN the system runs continuously THEN it SHALL check for new emails every 2 minutes during business hours (8 AM - 6 PM)