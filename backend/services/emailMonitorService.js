const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class EmailMonitorService {
  constructor() {
    this.gmail = null;
    this.isInitialized = false;
    this.monitoringInterval = null;
  }

  async initialize() {
    try {
      // Check if Gmail credentials are available
      if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
        console.log('Gmail credentials not configured - email monitoring disabled');
        return false;
      }

      const auth = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080/auth/gmail/callback'
      );

      // Set refresh token if available
      if (process.env.GMAIL_REFRESH_TOKEN) {
        auth.setCredentials({
          refresh_token: process.env.GMAIL_REFRESH_TOKEN
        });
      }

      this.gmail = google.gmail({ version: 'v1', auth });
      this.isInitialized = true;
      
      console.log('Email monitoring service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize email monitoring:', error);
      return false;
    }
  }

  async startMonitoring() {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return;
    }

    console.log('Starting email monitoring...');
    
    // Check emails every 5 minutes
    this.monitoringInterval = setInterval(() => {
      this.checkForNewEmails();
    }, 5 * 60 * 1000);

    // Check immediately on start
    this.checkForNewEmails();
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Email monitoring stopped');
    }
  }

  async checkForNewEmails() {
    try {
      console.log('Checking for new emails...');
      
      // Search for unread emails with survey-related keywords
      const query = 'is:unread (survey OR quote OR boundary OR "land survey" OR "property survey")';
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      if (!response.data.messages) {
        console.log('No new survey-related emails found');
        return;
      }

      console.log(`Found ${response.data.messages.length} potential survey emails`);

      for (const message of response.data.messages) {
        await this.processEmail(message.id);
      }
    } catch (error) {
      console.error('Error checking emails:', error);
    }
  }

  async processEmail(messageId) {
    try {
      const message = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const headers = message.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const from = headers.find(h => h.name === 'From')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      console.log(`Processing email: ${subject} from ${from}`);

      // Extract email body
      const body = this.extractEmailBody(message.data.payload);
      
      if (!body) {
        console.log('Could not extract email body');
        return;
      }

      // TODO: Parse email content using existing parseProjectText function
      // TODO: Create project from parsed data
      // TODO: Send confirmation email
      // TODO: Mark email as processed

      console.log('Email processed successfully');
      
    } catch (error) {
      console.error('Error processing email:', error);
    }
  }

  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return body;
  }

  async getAuthUrl() {
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080/auth/gmail/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ];

    return auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes
    });
  }

  async handleAuthCallback(code) {
    const auth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI || 'http://localhost:8080/auth/gmail/callback'
    );

    const { tokens } = await auth.getToken(code);
    
    console.log('Gmail authentication successful');
    console.log('Refresh token:', tokens.refresh_token);
    
    return tokens;
  }
}

module.exports = EmailMonitorService;