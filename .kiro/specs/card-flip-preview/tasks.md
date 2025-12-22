# Implementation Plan

- [x] 1. Set up backend API endpoints for public OneDrive file access


  - Create new endpoints in onedriveController.js for public file operations
  - Add methods to microsoftGraphService.js for accessing shared OneDrive folders
  - Implement file listing, thumbnail retrieval, and content access without authentication
  - _Requirements: 3.1, 5.1_


- [x] 1.1 Write property test for public file access

  - **Property 8: Public share access**
  - **Validates: Requirements 3.1, 5.1**

- [x] 2. Create FlippableCard wrapper component





  - Build React component that wraps existing ProjectCard
  - Implement flip state management (isFlipped, isAnimating)
  - Add CSS for 3D flip animation with 300-500ms timing
  - Handle flip button click events
  - _Requirements: 1.1, 1.4, 4.1, 4.2_

- [x] 2.1 Write property test for card flip state consistency

  - **Property 1: Card flip state consistency**
  - **Validates: Requirements 1.1, 1.4**


- [ ] 2.2 Write property test for animation timing
  - **Property 4: Animation timing bounds**
  - **Validates: Requirements 4.1**


- [x] 2.3 Write property test for UI state preservation


  - **Property 3: UI state preservation**
  - **Validates: Requirements 4.2, 4.4**

- [ ] 3. Build FilePreviewSide component
  - Create component for card back side showing file browser
  - Implement file list display with loading states

  - Add initialization prompt for uninitialized folders
  - Display file metadata (name, date, size)
  - _Requirements: 1.2, 1.3, 1.5, 3.2_


- [x] 3.1 Write property test for file list loading



  - **Property 2: File list loading from shared folders**
  - **Validates: Requirements 1.2**

- [ ] 3.2 Write property test for file metadata completeness
  - **Property 10: File metadata completeness**
  - **Validates: Requirements 3.2**




- [ ] 4. Implement file caching system
  - Create session storage utilities for file and thumbnail caching
  - Implement cache invalidation on card flip
  - Add memory cache for file previews with size limits
  - Handle cache expiration and refresh logic


  - _Requirements: 3.3, 5.2_

- [ ] 4.1 Write property test for thumbnail caching
  - **Property 6: Thumbnail caching consistency**
  - **Validates: Requirements 2.1, 5.2**

- [x] 5. Build thumbnail display functionality

  - Fetch thumbnails from OneDrive API for supported file types
  - Display thumbnail images in file list


  - Show file type icons for unsupported types
  - Implement lazy loading for thumbnails
  - _Requirements: 2.1, 2.5_

- [ ] 6. Create QuickPreviewModal component
  - Build modal overlay for file content preview
  - Implement PDF rendering with page navigation

  - Add image display with zoom capabilities
  - Show download option for unsupported file types


  - Add close button and keyboard shortcuts (Escape)
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ] 6.1 Write property test for preview modal functionality
  - **Property 7: Preview modal functionality**
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**


- [x] 7. Implement file size limits and error handling


  - Add 10MB limit for PDF previews
  - Add 50MB limit for image previews
  - Implement graceful error messages for API failures
  - Add retry mechanisms for failed operations
  - Handle network connectivity issues


  - _Requirements: 3.5, 5.3, 5.4_

- [ ] 7.1 Write property test for error handling
  - **Property 9: Error handling gracefully**


  - **Validates: Requirements 3.5, 5.4**



- [ ] 8. Add animation safeguards
  - Prevent multiple simultaneous flips on same card
  - Ensure independent animations for multiple cards
  - Add CSS fallbacks for browsers without 3D transforms



  - Clean up animation state on component unmount
  - _Requirements: 4.3, 4.5_

- [ ] 8.1 Write property test for concurrent animations
  - **Property 5: Concurrent animation independence**
  - **Validates: Requirements 4.5**

- [ ] 9. Integrate flip button into ProjectCards
  - Add "🔄 Flip" button to card actions
  - Position button appropriately in button row
  - Add flip back button on file preview side
  - Update ProjectCards.css with flip styles
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 10. Add direct OneDrive file links
  - Implement "Open in OneDrive" links for each file
  - Add download links for files
  - Ensure links work with public share URLs
  - _Requirements: 3.4_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Polish UI and animations
  - Fine-tune flip animation timing and easing
  - Add loading spinners and skeleton screens
  - Improve error message styling
  - Test responsive behavior on different screen sizes
  - _Requirements: 4.1, 4.2_

- [ ] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.