# Design Document: Project Ticketing System

## Overview

The project ticketing system adds lightweight update tracking to existing project cards without requiring authentication or changing card dimensions. The system provides two integration approaches: expanding the existing "More" button to include a "Project Updates" section, or displaying the 3 most recent tickets within the existing Notes section.

This design prioritizes minimal UI changes, seamless integration with existing components, and straightforward data persistence. All tickets are timestamped and attributed to a default user until authentication is implemented.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Project Card UI                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Job #, Client, Status, Tags                      │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Notes Section (Option 2: Show 3 tickets)  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  │  [More Button] ──► Expandable Section           │  │
│  │                    - Surveying Details           │  │
│  │                    - Project Updates (Option 1)  │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Ticket Manager      │
              │  - Create Ticket      │
              │  - Get Tickets        │
              │  - Validate Input     │
              └───────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Storage Layer       │
              │  - Persist Tickets    │
              │  - Retrieve Tickets   │
              │  - Query by Project   │
              └───────────────────────┘
```

### Component Separation

- **UI Layer**: Project card components, expandable sections, ticket display
- **Business Logic**: Ticket creation, validation, filtering, sorting
- **Data Layer**: Persistence, retrieval, and querying of ticket data

## Components and Interfaces

### Ticket Data Model

```typescript
interface Ticket {
  id: string;              // Unique identifier
  projectId: string;       // Associated project
  content: string;         // Ticket text content
  author: string;          // User identifier (default user for now)
  timestamp: Date;         // Creation timestamp
  createdAt: Date;         // ISO 8601 timestamp for persistence
}
```

### Ticket Manager

The Ticket Manager handles all business logic for ticket operations.

```typescript
interface TicketManager {
  // Create a new ticket for a project
  createTicket(projectId: string, content: string): Result<Ticket, ValidationError>;
  
  // Get all tickets for a project, sorted by timestamp descending
  getTickets(projectId: string): Ticket[];
  
  // Get the N most recent tickets for a project
  getRecentTickets(projectId: string, count: number): Ticket[];
  
  // Validate ticket content
  validateContent(content: string): Result<void, ValidationError>;
}
```

**Key Behaviors:**
- `createTicket`: Validates content, generates timestamp, assigns default user, persists ticket
- `getTickets`: Retrieves all tickets for a project in descending chronological order
- `getRecentTickets`: Returns the N most recent tickets (used for Notes section display)
- `validateContent`: Rejects empty or whitespace-only content

### Storage Interface

The storage layer abstracts persistence mechanisms.

```typescript
interface TicketStorage {
  // Save a ticket to storage
  save(ticket: Ticket): Promise<void>;
  
  // Retrieve all tickets for a project
  findByProject(projectId: string): Promise<Ticket[]>;
  
  // Retrieve all tickets (for initial load)
  findAll(): Promise<Ticket[]>;
}
```

**Implementation Options:**
- LocalStorage for browser-based persistence
- Database (SQLite, PostgreSQL) for server-side persistence
- JSON file storage for simple deployments

### UI Components

#### Option 1: More Button Approach

```typescript
interface ProjectUpdatesSection {
  projectId: string;
  tickets: Ticket[];
  onCreateTicket: (content: string) => void;
}
```

The "Project Updates" section appears when the More button is expanded, alongside existing surveying details.

**Layout:**
- Input field for new ticket content
- Submit button
- List of all tickets (timestamp, author, content)
- Scrollable if many tickets exist

#### Option 2: Notes Section Approach

```typescript
interface NotesSection {
  projectId: string;
  recentTickets: Ticket[];  // Limited to 3 most recent
  onViewAll: () => void;
  onCreateTicket: (content: string) => void;
}
```

The Notes section displays the 3 most recent tickets inline, with a link to view all tickets.

**Layout:**
- Display 3 most recent tickets (compact format)
- "View all updates" link
- Add ticket button/input (could be in modal or expanded view)

## Data Models

### Ticket Entity

**Fields:**
- `id`: UUID or auto-incrementing integer
- `projectId`: Foreign key to project
- `content`: Text field (max length: 1000 characters recommended)
- `author`: String (default: "system" or "default_user")
- `timestamp`: ISO 8601 datetime
- `createdAt`: ISO 8601 datetime (for sorting and display)

**Indexes:**
- Primary key on `id`
- Index on `projectId` for efficient querying
- Index on `timestamp` for sorting

### Storage Schema

**LocalStorage approach:**
```json
{
  "tickets": [
    {
      "id": "uuid-1",
      "projectId": "project-123",
      "content": "Initial site survey completed",
      "author": "default_user",
      "timestamp": "2024-01-15T10:30:00Z",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Database approach:**
```sql
CREATE TABLE tickets (
  id VARCHAR(36) PRIMARY KEY,
  project_id VARCHAR(36) NOT NULL,
  content TEXT NOT NULL,
  author VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  INDEX idx_project_id (project_id),
  INDEX idx_timestamp (timestamp)
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Whitespace content rejection
*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), attempting to create a ticket with that content should be rejected, and no ticket should be added to storage.
**Validates: Requirements 1.3**

### Property 2: Ticket added to project list
*For any* project and valid ticket content, creating a ticket for that project should result in the ticket appearing in that project's ticket list.
**Validates: Requirements 1.4**

### Property 3: Ticket persistence round-trip
*For any* valid ticket, after creating and persisting it, retrieving it from storage should return a ticket with the same content, author, project association, and a timestamp within a reasonable time window of creation.
**Validates: Requirements 1.5, 5.1, 5.3**

### Property 4: Recent tickets limited to maximum count
*For any* project with N tickets, requesting the K most recent tickets should return exactly min(N, K) tickets.
**Validates: Requirements 2.1, 2.3**

### Property 5: Ticket display includes required fields
*For any* ticket, the rendered display string should contain the ticket's timestamp, author, and content.
**Validates: Requirements 2.2, 6.4**

### Property 6: Tickets ordered chronologically descending
*For any* list of tickets retrieved for a project, the tickets should be ordered by timestamp in descending order (newest first).
**Validates: Requirements 2.5, 5.4, 6.3**

### Property 7: Application load retrieves all tickets
*For any* set of tickets created and persisted, simulating an application reload and retrieving tickets should return all previously created tickets.
**Validates: Requirements 5.2**

### Property 8: Display all tickets for project
*For any* project with N tickets, requesting all tickets for that project should return exactly N tickets.
**Validates: Requirements 6.1**

## Error Handling

### Input Validation Errors

**Empty or Whitespace Content:**
- Error Type: `ValidationError`
- Message: "Ticket content cannot be empty or contain only whitespace"
- Behavior: Reject ticket creation, maintain current state, display error to user

**Content Too Long:**
- Error Type: `ValidationError`
- Message: "Ticket content exceeds maximum length of 1000 characters"
- Behavior: Reject ticket creation, display error to user

### Storage Errors

**Persistence Failure:**
- Error Type: `StorageError`
- Message: "Failed to save ticket to storage"
- Behavior: Log error, display user-friendly message, allow retry

**Retrieval Failure:**
- Error Type: `StorageError`
- Message: "Failed to load tickets from storage"
- Behavior: Log error, display empty state with error message, allow retry

### Data Integrity Errors

**Missing Project:**
- Error Type: `ReferenceError`
- Message: "Cannot create ticket for non-existent project"
- Behavior: Reject ticket creation, log error

**Corrupted Ticket Data:**
- Error Type: `DataError`
- Message: "Ticket data is corrupted or invalid"
- Behavior: Skip corrupted ticket, log error, continue loading other tickets

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of ticket creation and display
- Edge cases (empty lists, single ticket, exactly 3 tickets)
- Error conditions (invalid input, storage failures)
- Integration between UI components and business logic
- Empty state display (Requirement 2.4)
- UI structure for specific configuration options (Requirement 4.1)

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Input validation across all whitespace combinations
- Ordering and filtering behavior across random ticket sets
- Persistence round-trips with randomly generated data
- Display formatting with varied content

### Property-Based Testing Configuration

**Library Selection:**
- TypeScript/JavaScript: fast-check
- Python: Hypothesis
- Java: jqwik
- Other languages: Select appropriate PBT library

**Test Configuration:**
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: project-ticketing-system, Property N: [property text]`

**Example Test Structure:**
```typescript
// Feature: project-ticketing-system, Property 1: Whitespace content rejection
test('whitespace content is rejected', () => {
  fc.assert(
    fc.property(
      fc.string().filter(s => s.trim() === ''), // Generate whitespace strings
      (content) => {
        const result = ticketManager.createTicket('project-1', content);
        expect(result.isError()).toBe(true);
        expect(ticketManager.getTickets('project-1')).toHaveLength(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Goals

- 100% coverage of ticket creation logic
- 100% coverage of validation functions
- 100% coverage of sorting and filtering logic
- Integration tests for both UI approaches (More button and Notes section)
- All 8 correctness properties implemented as property-based tests
- Unit tests for specific examples and error conditions
