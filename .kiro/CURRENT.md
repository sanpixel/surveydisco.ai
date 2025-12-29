# SurveyDisco.ai - Current Implementation

## Overview

SurveyDisco.ai is a project management application for surveying work. It allows users to create, manage, and track surveying projects with integrated OneDrive file storage and preview capabilities.

## Core Features

### 1. Project Management

**Project Cards**
- Display project information in card format on a grid
- Editable fields: client, email, phone, prepared for, address, geo address, parcel/APN, area, service type, cost estimate, action, filename, notes, tags
- Read-only fields: created date, modified date, job number
- Expandable section for surveying details: land lot, district, county, deed book/page, plat book/page
- Travel time and distance display with refresh capability

**Project Creation**
- Text input parsing via GPT to extract project details from pasted text (emails, etc.)
- Auto-generates job numbers in YYMMDD format with sequential suffix

**Project Actions**
- Open in Google Maps (address lookup)
- Open in Regrid (copies geo address to clipboard)
- Open in GSCCCA (Georgia deed search)
- Delete with password protection

### 2. Card Flip File Preview

**Flip Mechanism**
- Click job number (#XXXXXX) to flip card
- 3D CSS transform animation (400ms)
- Front: project info, Back: file browser
- Click header on back to flip back to front

**File Browser (Back of Card)**
- Lists files from project's OneDrive folder
- Shows file thumbnails, name, size, date
- Filename truncation with ellipsis (shows beginning of name)
- File count badge in header

**File Filtering**
- Files containing "invoice" in name are hidden by default
- Admin mode reveals hidden files

### 3. OneDrive Integration

**Folder Initialization**
- "Init" button creates OneDrive folder for project
- Folder path: `_SurveyDisco/{jobNumber}-{clientName}-{geoAddress}`
- Stores folder URL in database

**Authentication**
- Uses Microsoft Graph API with refresh token
- Refresh token stored in `surveydisco_settings` table
- Token auto-refreshes when expired

**File Operations**
- List files from project folder
- Get file thumbnails
- Get file content for preview
- Download files

### 4. Quick Preview Modal

**Supported File Types**
- Images: JPEG, PNG, GIF, WebP, SVG (direct display with zoom controls)
- PDFs: Full resolution rendering via PDF.js library with page navigation
- Text files: Monospace display
- DWG files: Link to external viewer (dwgsee.com)

**Controls**
- Zoom in/out for images
- Page navigation for multi-page PDFs
- Download button
- Keyboard shortcuts: Escape to close, arrows for pages, +/- for zoom

### 5. Admin Mode

**Activation**
- Click "SurveyDisco.ai" title
- Enter password: "kingsport"
- Title turns red when admin mode active
- Click again to deactivate

**Admin Features**
- Shows hidden invoice files in file browser
- (Extensible for future debug features)

### 6. TODO Card

- Separate card for tracking enhancement ideas
- Add/edit/delete todo items
- Persisted to database

### 7. Web Dev Text

- Editable text below header
- Click to edit, saves on blur
- Stored in settings table

## Technical Architecture

### Frontend (React)

**Components**
- `App.js` - Main app wrapper, admin provider
- `ProjectCards.js` - Grid of project cards
- `FlippableCard.js` - Card flip container
- `FilePreviewSide.js` - File browser on card back
- `QuickPreviewModal.js` - File preview overlay with PDF.js
- `ThumbnailLoader.js` - Lazy thumbnail loading
- `TodoCard.js` - Todo list component
- `TextInput.js` - Project creation input

**Contexts**
- `AdminContext.js` - Global admin mode state

**Services**
- `fileCacheService.js` - File list and preview caching
- `errorHandlingService.js` - Graceful error handling
- `onedriveService.js` - OneDrive API helpers

### Backend (Node.js/Express)

**Controllers**
- `onedriveController.js` - OneDrive API endpoints

**Services**
- `microsoftGraphService.js` - Microsoft Graph API wrapper

**Database (PostgreSQL)**
- `surveydisco_projects` - Project data
- `surveydisco_todo_items` - Todo items
- `surveydisco_settings` - App settings (web text, refresh token)

### API Endpoints

**Projects**
- `GET /api/projects` - List all projects
- `GET /api/projects/:jobNumber` - Get single project
- `POST /api/projects/parse` - Parse text and create project
- `PATCH /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project (requires password)
- `POST /api/projects/:id/refresh-travel` - Refresh travel time

**OneDrive**
- `POST /api/onedrive/init-folder` - Create project folder
- `GET /api/onedrive/public-files/:jobNumber` - List files
- `POST /api/onedrive/public-thumbnails/:jobNumber` - Get thumbnail
- `GET /api/onedrive/public-file-content/:projectId/:fileId` - Get file content
- `GET /api/onedrive/auth-callback` - OAuth callback

**Settings**
- `GET /api/settings/:key` - Get setting
- `PATCH /api/settings/:key` - Update setting

**Todos**
- `GET /api/todos` - List todos
- `POST /api/todos` - Create todo
- `PATCH /api/todos/:id` - Update todo
- `DELETE /api/todos/:id` - Delete todo

## Deployment

- Docker containerized
- GitHub Actions CI/CD
- Frontend build served by Express
- PostgreSQL database
