const request = require('supertest');
const express = require('express');
const fc = require('fast-check');
const MicrosoftGraphService = require('../services/microsoftGraphService');
const OneDriveController = require('../controllers/onedriveController');

// Mock the database pool
const mockPool = {
  query: jest.fn()
};

// Mock the Microsoft Graph Service
jest.mock('../services/microsoftGraphService');

describe('OneDrive Public File Access', () => {
  let app;
  let onedriveController;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create controller with mocked pool
    onedriveController = new OneDriveController();
    onedriveController.pool = mockPool;
    
    // Setup routes
    app.get('/api/onedrive/public-files/:projectId', async (req, res) => {
      await onedriveController.getPublicFiles(req, res);
    });
    
    app.post('/api/onedrive/public-thumbnails/:projectId', async (req, res) => {
      await onedriveController.getPublicThumbnails(req, res);
    });
    
    app.get('/api/onedrive/public-file-content/:projectId/:fileId', async (req, res) => {
      await onedriveController.getPublicFileContent(req, res);
    });

    // Clear all mocks
    jest.clearAllMocks();
  });

  /**
   * **Feature: card-flip-preview, Property 8: Public share access**
   * Property: For any OneDrive folder with a public share URL, the system should access files and thumbnails without requiring user authentication
   * Validates: Requirements 3.1, 5.1
   */
  describe('Property 8: Public share access', () => {
    test('should access files from public OneDrive shares without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.webUrl(), // shareUrl
          fc.array(fc.record({
            id: fc.string({ minLength: 1, maxLength: 50 }),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            size: fc.integer({ min: 0, max: 1000000 }),
            lastModifiedDateTime: fc.date().map(d => d.toISOString()),
            file: fc.record({
              mimeType: fc.constantFrom('application/pdf', 'image/jpeg', 'image/png', 'text/plain')
            }),
            webUrl: fc.webUrl(),
            '@microsoft.graph.downloadUrl': fc.webUrl()
          }), { minLength: 0, maxLength: 10 }), // files array
          async (projectId, shareUrl, mockFiles) => {
            // Setup database mock to return the share URL
            mockPool.query.mockResolvedValueOnce({
              rows: [{ onedrive_folder_url: shareUrl }]
            });

            // Setup Microsoft Graph Service mock
            const mockGraphService = new MicrosoftGraphService();
            mockGraphService.getPublicFiles = jest.fn().mockResolvedValue(
              mockFiles.map(file => ({
                id: file.id,
                name: file.name,
                size: file.size,
                lastModified: new Date(file.lastModifiedDateTime),
                mimeType: file.file.mimeType,
                webUrl: file.webUrl,
                downloadUrl: file['@microsoft.graph.downloadUrl'],
                isPreviewable: ['application/pdf', 'image/jpeg', 'image/png'].includes(file.file.mimeType)
              }))
            );

            onedriveController.graphService = mockGraphService;

            // Make request to public files endpoint
            const response = await request(app)
              .get(`/api/onedrive/public-files/${projectId}`)
              .expect(200);

            // Verify response structure
            expect(response.body).toHaveProperty('files');
            expect(response.body).toHaveProperty('folderInitialized', true);
            expect(response.body).toHaveProperty('shareUrl', shareUrl);
            expect(Array.isArray(response.body.files)).toBe(true);

            // Verify each file has required properties
            response.body.files.forEach(file => {
              expect(file).toHaveProperty('id');
              expect(file).toHaveProperty('name');
              expect(file).toHaveProperty('size');
              expect(file).toHaveProperty('lastModified');
              expect(file).toHaveProperty('mimeType');
              expect(file).toHaveProperty('webUrl');
              expect(file).toHaveProperty('downloadUrl');
              expect(file).toHaveProperty('isPreviewable');
              expect(typeof file.isPreviewable).toBe('boolean');
            });

            // Verify no authentication was required (no auth headers sent)
            expect(mockGraphService.getPublicFiles).toHaveBeenCalledWith(shareUrl);
            expect(mockGraphService.getPublicFiles).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle projects without initialized OneDrive folders', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          async (projectId) => {
            // Setup database mock to return no folder URL
            mockPool.query.mockResolvedValueOnce({
              rows: [{ onedrive_folder_url: null }]
            });

            // Make request to public files endpoint
            const response = await request(app)
              .get(`/api/onedrive/public-files/${projectId}`)
              .expect(200);

            // Verify response indicates folder not initialized
            expect(response.body).toHaveProperty('files', []);
            expect(response.body).toHaveProperty('folderInitialized', false);
            expect(response.body).toHaveProperty('message', 'OneDrive folder not initialized');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle thumbnail requests without authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.string({ minLength: 1, maxLength: 50 }), // fileId
          fc.webUrl(), // shareUrl
          fc.option(fc.webUrl(), { nil: null }), // thumbnailUrl (can be null)
          async (projectId, fileId, shareUrl, thumbnailUrl) => {
            // Setup database mock
            mockPool.query.mockResolvedValueOnce({
              rows: [{ onedrive_folder_url: shareUrl }]
            });

            // Setup Microsoft Graph Service mock
            const mockGraphService = new MicrosoftGraphService();
            mockGraphService.getPublicFileThumbnails = jest.fn().mockResolvedValue(thumbnailUrl);
            onedriveController.graphService = mockGraphService;

            // Make request to thumbnails endpoint
            const response = await request(app)
              .post(`/api/onedrive/public-thumbnails/${projectId}`)
              .send({ fileId })
              .expect(200);

            // Verify response
            expect(response.body).toHaveProperty('thumbnailUrl', thumbnailUrl);
            expect(mockGraphService.getPublicFileThumbnails).toHaveBeenCalledWith(shareUrl, fileId);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle file content requests with size limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.string({ minLength: 1, maxLength: 50 }), // fileId
          fc.webUrl(), // shareUrl
          fc.integer({ min: 1, max: 50 * 1024 * 1024 }), // maxSize
          async (projectId, fileId, shareUrl, maxSize) => {
            // Setup database mock
            mockPool.query.mockResolvedValueOnce({
              rows: [{ onedrive_folder_url: shareUrl }]
            });

            // Create mock file content
            const mockContent = new ArrayBuffer(Math.min(maxSize, 1024)); // Small test content

            // Setup Microsoft Graph Service mock
            const mockGraphService = new MicrosoftGraphService();
            mockGraphService.getPublicFileContent = jest.fn().mockResolvedValue(mockContent);
            onedriveController.graphService = mockGraphService;

            // Make request to file content endpoint
            const response = await request(app)
              .get(`/api/onedrive/public-file-content/${projectId}/${fileId}`)
              .query({ maxSize })
              .expect(200);

            // Verify the service was called with correct parameters
            expect(mockGraphService.getPublicFileContent).toHaveBeenCalledWith(
              expect.any(String), // shareUrl can be any string
              fileId, 
              maxSize
            );
            
            // Verify response headers
            expect(response.headers['content-type']).toBe('application/octet-stream');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle invalid share URLs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // projectId
          fc.string({ minLength: 1, maxLength: 20 }), // invalid URL
          async (projectId, invalidUrl) => {
            // Setup database mock with invalid URL
            mockPool.query.mockResolvedValueOnce({
              rows: [{ onedrive_folder_url: invalidUrl }]
            });

            // Setup Microsoft Graph Service mock to throw error
            const mockGraphService = new MicrosoftGraphService();
            mockGraphService.getPublicFiles = jest.fn().mockRejectedValue(
              new Error('Invalid share URL')
            );
            onedriveController.graphService = mockGraphService;

            // Make request and expect error
            const response = await request(app)
              .get(`/api/onedrive/public-files/${projectId}`)
              .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid OneDrive share URL');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});