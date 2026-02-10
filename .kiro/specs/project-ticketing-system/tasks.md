# Implementation Plan: Project Ticketing System

## Overview

This plan implements a lightweight ticketing/updates system for project cards. The implementation follows a bottom-up approach: database schema first, then data layer, business logic, and finally UI integration. Each task builds incrementally with testing integrated throughout.

## Tasks

- [x] 1. Create database schema and migration
  - Write SQL migration to add `tickets` table with fields: id, project_id, content, author, timestamp, created_at
  - Add indexes on project_id and timestamp for efficient querying
  - Test migration runs successfully and creates table with correct schema
  - _Requirements: 5.1, 5.3_

- [x] 2. Implement data models and storage layer
  - [x] 2.1 Create Ticket data model with TypeScript interface
    - Define Ticket interface with id, projectId, content, author, timestamp, createdAt fields
    - Create type definitions for storage operations
    - _Requirements: 5.3_
  
  - [x] 2.2 Implement TicketStorage interface
    - Write save() method to persist tickets to database
    - Write findByProject() method to retrieve tickets for a specific project
    - Write findAll() method to retrieve all tickets
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 2.3 Write property test for ticket persistence round-trip
    - **Property 3: Ticket persistence round-trip**
    - **Validates: Requirements 1.5, 5.1, 5.3**
  
  - [x] 2.4 Write unit tests for storage layer
    - Test save operation with valid ticket
    - Test findByProject returns correct tickets
    - Test findAll retrieves all tickets
    - Test error handling for storage failures
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 3. Implement ticket validation logic
  - [x] 3.1 Create validation functions
    - Write validateContent() to reject empty or whitespace-only strings
    - Write function to check content length (max 1000 characters)
    - Return appropriate ValidationError for invalid input
    - _Requirements: 1.3_
  
  - [x] 3.2 Write property test for whitespace rejection
    - **Property 1: Whitespace content rejection**
    - **Validates: Requirements 1.3**
  
  - [x] 3.3 Write unit tests for validation edge cases
    - Test empty string rejection
    - Test single space rejection
    - Test mixed whitespace (tabs, newlines) rejection
    - Test content length validation
    - _Requirements: 1.3_

- [x] 4. Implement TicketManager business logic
  - [x] 4.1 Implement createTicket() method
    - Validate content using validation functions
    - Generate unique ID (UUID)
    - Generate timestamp
    - Assign default user as author
    - Call storage layer to persist ticket
    - Return Result type with ticket or error
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 4.2 Implement getTickets() method
    - Retrieve all tickets for a project from storage
    - Sort tickets by timestamp in descending order
    - Return sorted array
    - _Requirements: 2.5, 6.1_
  
  - [x] 4.3 Implement getRecentTickets() method
    - Call getTickets() to get all tickets
    - Slice array to return only first N tickets
    - Handle case where fewer than N tickets exist
    - _Requirements: 2.1, 2.3_
  
  - [x] 4.4 Write property test for ticket added to project list
    - **Property 2: Ticket added to project list**
    - **Validates: Requirements 1.4**
  
  - [x] 4.5 Write property test for recent tickets limited to maximum count
    - **Property 4: Recent tickets limited to maximum count**
    - **Validates: Requirements 2.1, 2.3**
  
  - [x] 4.6 Write property test for chronological ordering
    - **Property 6: Tickets ordered chronologically descending**
    - **Validates: Requirements 2.5, 5.4, 6.3**
  
  - [x] 4.7 Write property test for display all tickets
    - **Property 8: Display all tickets for project**
    - **Validates: Requirements 6.1**
  
  - [x] 4.8 Write unit tests for TicketManager
    - Test createTicket with valid input
    - Test createTicket with invalid input returns error
    - Test getRecentTickets with empty list
    - Test getRecentTickets with exactly 3 tickets
    - Test getRecentTickets with more than 3 tickets
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.3_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement ticket display formatting
  - [x] 6.1 Create ticket rendering function
    - Write function to format ticket as string with timestamp, author, and content
    - Format timestamp in human-readable format
    - Handle long content with truncation or wrapping
    - _Requirements: 2.2_
  
  - [x] 6.2 Write property test for display includes required fields
    - **Property 5: Ticket display includes required fields**
    - **Validates: Requirements 2.2, 6.4**
  
  - [x] 6.3 Write unit tests for rendering
    - Test rendering with various content lengths
    - Test timestamp formatting
    - Test author display
    - _Requirements: 2.2_

- [x] 7. Implement UI components - Option 1 (More Button approach)
  - [x] 7.1 Create ProjectUpdatesSection component
    - Create expandable section component
    - Add input field for new ticket content
    - Add submit button
    - Display list of all tickets using rendering function
    - Wire up onCreateTicket handler to call TicketManager.createTicket()
    - _Requirements: 4.1, 6.1_
  
  - [x] 7.2 Integrate ProjectUpdatesSection with More Button
    - Add ProjectUpdatesSection to More Button expandable area
    - Ensure surveying details section remains intact
    - Maintain card size constraints (collapsed state unchanged)
    - _Requirements: 3.1, 3.2, 4.1, 4.3_
  
  - [x] 7.3 Write unit test for UI structure
    - Test that More Button expansion shows Project Updates section
    - Test that surveying details remain visible
    - _Requirements: 4.1, 4.3_

- [ ] 8. Implement UI components - Option 2 (Notes Section approach)
  - [ ] 8.1 Create enhanced NotesSection component
    - Display 3 most recent tickets using getRecentTickets()
    - Add "View all updates" link
    - Create modal or expanded view for all tickets
    - Add button/input for creating new tickets
    - Wire up ticket creation to TicketManager
    - _Requirements: 2.1, 4.2, 6.2_
  
  - [ ] 8.2 Integrate enhanced NotesSection with Project Card
    - Replace or enhance existing Notes section
    - Ensure component fits within existing space allocation
    - Maintain card size constraints
    - _Requirements: 2.1, 3.1, 3.3_
  
  - [ ] 8.3 Write unit test for empty state display
    - Test that empty ticket list shows appropriate message
    - _Requirements: 2.4_

- [ ] 9. Implement application initialization
  - [x] 9.1 Create ticket loading on app startup
    - Call TicketStorage.findAll() on application load
    - Populate ticket cache or state management
    - Handle storage errors gracefully
    - _Requirements: 5.2_
  
  - [x] 9.2 Write property test for application load retrieves all tickets
    - **Property 7: Application load retrieves all tickets**
    - **Validates: Requirements 5.2**
  
  - [x] 9.3 Write integration test for full ticket lifecycle
    - Test creating ticket, reloading app, and verifying ticket persists
    - _Requirements: 1.5, 5.2_

- [x] 10. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Task 1 provides the SQL migration needed to add the tickets table
- Tasks 7 and 8 are alternatives - implement only the chosen UI approach (More Button OR Notes Section)
- Each property test references its design document property number
- All property tests should run minimum 100 iterations
- Integration tests verify end-to-end functionality
- Checkpoints ensure incremental validation
