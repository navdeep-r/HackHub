const { google } = require('googleapis');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
    );
  }

  // Generate authorization URL
  generateAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange code for tokens
  async getTokensFromCode(code) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw error;
    }
  }

  // Refresh access token (non-deprecated method)
  async refreshAccessToken(refreshToken) {
    try {
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
      const { credentials } = await this.oauth2Client.getAccessToken();
      return credentials;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // Monitor emails for hackathon confirmations
  async monitorEmailsForConfirmation(userId, hackathonId, emailAddresses) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.googleAccessToken) {
        throw new Error('User not found or Google access token not available');
      }

      // Set up Gmail API
      this.oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Search for confirmation emails in the last 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      const afterDate = oneDayAgo.toISOString().split('T')[0];

      // Create search query for confirmation emails
      const searchQuery = `(from:${this.getHackathonEmailDomains()}) (subject:confirmation OR subject:registered OR subject:success) after:${afterDate}`;

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 50
      });

      const messages = response.data.messages || [];
      let confirmationFound = false;

      for (const message of messages) {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date']
        });

        const headers = email.data.payload.headers;
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';

        // Check if this is a confirmation email for the specific hackathon
        if (this.isConfirmationEmail(subject, from, emailAddresses)) {
          // Update hackathon registration status
          await Hackathon.findByIdAndUpdate(hackathonId, {
            $set: {
              'registeredStudents.$[elem].confirmationStatus': 'confirmed',
              'registeredStudents.$[elem].confirmedAt': new Date()
            }
          }, {
            arrayFilters: [{ 'elem.student': userId }],
            new: true
          });

          confirmationFound = true;
          console.log(`Confirmation found for user ${userId} in hackathon ${hackathonId}`);
          break;
        }
      }

      return confirmationFound;
    } catch (error) {
      console.error('Error monitoring emails:', error);
      throw error;
    }
  }

  // Get common hackathon platform email domains
  getHackathonEmailDomains() {
    return [
      'devpost.com',
      'hackerearth.com',
      'hackerrank.com',
      'topcoder.com',
      'codeforces.com',
      'leetcode.com',
      'kaggle.com',
      'mlh.io',
      'hackmit.org',
      'hacktx.com',
      'hackdavis.io',
      'hackuci.com',
      'hacktech.io',
      'hackny.org',
      'hackduke.org',
      'hackrice.org'
    ].join(' OR from:');
  }

  // Check if email is a confirmation email
  isConfirmationEmail(subject, from, userEmails) {
    const confirmationKeywords = [
      'confirmation',
      'registered',
      'success',
      'welcome',
      'confirmed',
      'registration successful',
      'you are registered',
      'registration confirmed'
    ];

    const subjectLower = subject.toLowerCase();
    const fromLower = from.toLowerCase();

    // Check if subject contains confirmation keywords
    const hasConfirmationKeyword = confirmationKeywords.some(keyword => 
      subjectLower.includes(keyword)
    );

    // Check if from address matches user's emails
    const fromMatchesUserEmail = userEmails.some(email => 
      fromLower.includes(email.toLowerCase())
    );

    return hasConfirmationKeyword || fromMatchesUserEmail;
  }

  // Start monitoring for a specific registration
  async startMonitoring(userId, hackathonId, emailUsed) {
    try {
      // Schedule email monitoring
      const monitoringInterval = setInterval(async () => {
        try {
          const user = await User.findById(userId);
          const hackathon = await Hackathon.findById(hackathonId);

          if (!user || !hackathon) {
            clearInterval(monitoringInterval);
            return;
          }

          // Check if registration is already confirmed
          const registration = hackathon.registeredStudents.find(
            reg => reg.student.toString() === userId.toString()
          );

          if (registration && registration.confirmationStatus === 'confirmed') {
            clearInterval(monitoringInterval);
            return;
          }

          // Monitor emails
          const emailAddresses = [user.email];
          if (user.secondaryEmail) {
            emailAddresses.push(user.secondaryEmail);
          }

          const confirmationFound = await this.monitorEmailsForConfirmation(
            userId, 
            hackathonId, 
            emailAddresses
          );

          if (confirmationFound) {
            clearInterval(monitoringInterval);
          }
        } catch (error) {
          console.error('Error in monitoring interval:', error);
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      // Stop monitoring after 24 hours
      setTimeout(() => {
        clearInterval(monitoringInterval);
      }, 24 * 60 * 60 * 1000);

      return true;
    } catch (error) {
      console.error('Error starting monitoring:', error);
      throw error;
    }
  }

  // Validate tokens
  async validateTokens(accessToken, refreshToken) {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      // Try to access Gmail API to validate tokens
      await gmail.users.getProfile({ userId: 'me' });
      
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  // Get user's Gmail profile
  async getGmailProfile(accessToken) {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
      
      const profile = await gmail.users.getProfile({ userId: 'me' });
      return profile.data;
    } catch (error) {
      console.error('Error getting Gmail profile:', error);
      throw error;
    }
  }
}

module.exports = new GoogleAuthService();
