# Card Flip File Preview Design Document

## Overview

The Card Flip File Preview feature adds a 3D flip animation to project cards, allowing users to toggle between the standard project information view and a file browser view that displays OneDrive files with thumbnail previews and quick file viewing capabilities. The feature leverages the existing Microsoft Graph API integration and extends the current ProjectCards component with new file management capabilities.

## Architecture

The system follows a component-based architecture that extends the existing React card system:

```
┌─────────────────────────────────────────────────────────────┐
│                    ProjectCards Component                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────┐  │
│  │   Card Front    │    │         Card Back               │  │
│  │  (Project Info) │◄──►│    (File Browser)               │  │
│  │                 │    │                                 │  │
│  │  - Client Info  │    │  - File List                    │  │
│  │  - Address      │    │  - Thumbnails                   │  │
│  │  - Actions      │    │  - Quick Preview                │  │
│  └─────────────────┘    └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend Services                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           Microsoft Graph Service                       │ │
│  │  - File listing (/me/drive/items/{id}/children)        │ │
│  │  - Thumbnails (/me/drive/items/{id}/thumbnails)        │ │
│  │  - File content (/me/drive/items/{id}/content)         │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Frontend Components

**FlippableCard Component**
- Wraps existing ProjectCard with flip functionality
- Manages flip state and animation classes
- Handles card orientation (front/back)

**FilePreviewSide Component**
- Renders file browser interface on card back
- Displays file list with thumbnails from public OneDrive shares
- Shows initialization prompt when folder not yet created
- Handles file selection and preview modal

**QuickPreviewModal Component**
- Overlay component for file content preview
- Supports PDF rendering and image display
- Provides zoom and navigation controls

### Backend API Extensions

**OneDrive Controller Extensions**
```javascript
// New endpoints to add to existing onedriveController.js
GET /api/onedrive/public-files/:projectId
POST /api/onedrive/public-thumbnails/:projectId
GET /api/onedrive/public-file-content/:projectId/:fileId
```

**Microsoft Graph Service Extensions**
```javascript
// New methods to add to existing microsoftGraphService.js
async getPublicFiles(shareUrl)
async getPublicFileThumbnails(shareUrl, fileId)  
async getPublicFileContent(shareUrl, fileId, maxSize)
```

## Data Models

### File Information Model
```typescript
interface FileInfo {
  id: string;
  name: string;
  size: number;
  lastModified: Date;
  mimeType: string;
  thumbnailUrl?: string;
  webUrl: string;
  downloadUrl: string;
  isPreviewable: boolean;
}
```

### Card State Model
```typescript
interface CardFlipState {
  isFlipped: boolean;
  isAnimating: boolean;
  files: FileInfo[];
  selectedFile?: FileInfo;
  showPreview: boolean;
  loadingFiles: boolean;
  folderInitialized: boolean;
  error?: string;
}
```

### File Cache Strategy
```typescript
interface FileCacheEntry {
  projectId: string;
  files: FileInfo[];
  thumbnails: Map<string, string>; // fileId -> base64 thumbnail
  lastFetched: Date;
  shareUrl: string;
}

// Storage locations:
// - Component state: Current card's file list and UI state
// - Session storage: Cached files and thumbnails across card flips
// - Memory cache: Recently accessed file previews (limited size)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Property 1: Card flip state consistency**
*For any* project card, when the flip button is clicked, the card state should toggle between front and back views with appropriate animation classes applied
**Validates: Requirements 1.1, 1.4**

**Property 2: File list loading from shared folders**
*For any* project card when flipped to file view, the system should load and display files from the public OneDrive share URL without requiring authentication
**Validates: Requirements 1.2**

**Property 3: UI state preservation**
*For any* card flip operation, the card's expanded/collapsed state and position in the grid should remain unchanged
**Validates: Requirements 4.2, 4.4**

**Property 4: Animation timing bounds**
*For any* flip animation, the rotation should complete within the specified 300-500 millisecond timeframe
**Validates: Requirements 4.1**

**Property 5: Concurrent animation independence**
*For any* set of cards being flipped simultaneously, each animation should execute independently without interference
**Validates: Requirements 4.5**

**Property 6: Thumbnail caching consistency**
*For any* file that supports thumbnails, the thumbnail service should retrieve, cache in session storage, and display the preview image consistently across card flips
**Validates: Requirements 2.1, 5.2**

**Property 7: Preview modal functionality**
*For any* file click event, the system should display appropriate preview content based on file type (PDF pages, images, or download options)
**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

**Property 8: Public share access**
*For any* OneDrive folder with a public share URL, the system should access files and thumbnails without requiring user authentication
**Validates: Requirements 3.1, 5.1**

**Property 9: Error handling gracefully**
*For any* API failure or network issue, the system should display appropriate error messages and provide retry options
**Validates: Requirements 3.5, 5.4**

**Property 10: File metadata completeness**
*For any* file displayed in the browser, the system should show file name, modification date, and size information
**Validates: Requirements 3.2**

## Error Handling

### Network Errors
- Graceful degradation when OneDrive API is unavailable
- Cached thumbnail display during connectivity issues
- Retry mechanisms for failed file operations
- User-friendly error messages with actionable guidance

### Authentication Errors
- No authentication required - uses public OneDrive share URLs
- Card flip works for all users regardless of login state
- Clear indication when folder needs initialization
- Graceful handling when share URLs are invalid or expired

### File Processing Errors
- Size limits for preview operations (10MB max for PDFs, 50MB max for images)
- Fallback to download links for unsupported file types
- Error boundaries to prevent card crashes from file processing issues

### Animation Errors
- CSS fallbacks for browsers without 3D transform support
- Animation state cleanup on component unmount
- Prevention of multiple simultaneous animations on same card

## Testing Strategy

### Unit Testing
The testing approach combines unit tests for specific functionality with property-based tests for universal behaviors:

**Unit Tests:**
- Component rendering with different props
- Event handler execution (flip button clicks, file selections)
- API integration points with mock responses
- Error boundary behavior with simulated failures

**Property-Based Testing:**
Using Jest and React Testing Library with property-based testing via fast-check library:

- **Minimum 100 iterations per property test** to ensure comprehensive coverage
- **Property test tagging format**: Each test tagged with `**Feature: card-flip-preview, Property {number}: {property_text}**`
- **Single property per test**: Each correctness property implemented by exactly one property-based test

**Integration Testing:**
- End-to-end card flip workflows
- OneDrive API integration with test Microsoft Graph endpoints
- File preview functionality across different file types
- Animation performance under various browser conditions

### Test Configuration
- Jest configured with React Testing Library
- fast-check library for property-based testing
- Mock Microsoft Graph API responses for consistent testing
- CSS animation testing with reduced motion preferences
- File upload/download simulation for integration tests