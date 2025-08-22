const { google } = require('googleapis');
const User = require('../models/User');
const Hackathon = require('../models/Hackathon');
const notifier = require('./notifier');

class GoogleAuthService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );
  }

  // Generate authorization URL
  generateAuthUrl(userId) {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    console.log("userid: ", userId)
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId.toString()
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

  // Monitor emails for hackathon confirmations (12-hour window, unstop.com focus)
  async monitorEmailsForConfirmation(userId, hackathonId, emailAddresses, options = {}) {
    try {
      const {
        allowedDomains = ['unstop.com'],
        subjectRegex = /(registration|confirmed|success|welcome|you are registered|registration successful)/i,
        lookbackHours = 12
      } = options;

      const user = await User.findById(userId);
      if (!user || !user.google || !user.google.accessToken) {
        throw new Error('User not found or Google access token not available');
      }

      // Set up Gmail API
      this.oauth2Client.setCredentials({
        access_token: user.google.accessToken,
        refresh_token: user.google.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Search for confirmation emails in the last N hours
      const since = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

      // Create search query for confirmation emails from allowed domains
      const fromFilter = allowedDomains.map(d => `from:${d}`).join(' OR ');
      const searchQuery = `(${fromFilter}) newer_than:${Math.max(lookbackHours, 1)}h`;

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
        console.log(headers)
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';

        const subjectMatch = subjectRegex.test(subject);
        const fromLower = from.toLowerCase();
        const domainMatch = allowedDomains.some(d => fromLower.includes(d));

        if (!(subjectMatch && domainMatch)) continue;

        // Update hackathon registration status and metadata
        const updated = await Hackathon.findOneAndUpdate(
          { _id: hackathonId, 'registeredStudents.student': userId },
          {
            $set: {
              'registeredStudents.$.confirmationStatus': 'confirmed',
              'registeredStudents.$.confirmedAt': new Date(),
              'registeredStudents.$.platform': 'unstop',
              'registeredStudents.$.confirmationEmail': {
                id: message.id,
                subject,
                from,
                date: new Date(headers.find(h => h.name === 'Date')?.value || Date.now()),
                snippet: email.data.snippet
              }
            },
            $inc: { 'registeredStudents.$.confirmationChecks': 1, registrations: 1 }
          },
          { new: true }
        );

        // Notify faculty dashboard/webhook
        try {
          await notifier.notifyRegistrationConfirmed({
            hackathonId,
            userId,
            platform: 'unstop',
            email: updated?.registeredStudents?.find(r => String(r.student) === String(userId))?.confirmationEmail || null
          });
        } catch (notifyErr) {
          console.error('Notifier error:', notifyErr.message);
        }

        confirmationFound = true;
        break;
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

  // Deprecated helper removed in favor of explicit domain + regex matching

  // Start monitoring for a specific registration (every X minutes up to 12 hours)
  async startMonitoring(userId, hackathonId, emailUsed, options = {}) {
    try {
      const {
        intervalMinutes = 5,
        totalWindowHours = 12,
        allowedDomains = ['unstop.com'],
        subjectRegex = /(registration|confirmed|success|welcome|you are registered|registration successful)/i
      } = options;

      const startedAt = Date.now();
      // Schedule email monitoring
      const monitor = async () => {
        try {
          console.log('monitoring')
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

          // Monitor emails (focus on unstop)
          const emailAddresses = [user.email, user.secondaryEmail].filter(Boolean);

          const confirmationFound = await this.monitorEmailsForConfirmation(userId, hackathonId, emailAddresses, {
            allowedDomains,
            subjectRegex,
            lookbackHours: totalWindowHours
          });

          if (confirmationFound) {
            clearInterval(monitoringInterval);
          }

          // update check counters
          await Hackathon.updateOne(
            { _id: hackathonId, 'registeredStudents.student': userId },
            {
              $inc: { 'registeredStudents.$.confirmationChecks': 1 },
              $set: { 'registeredStudents.$.lastCheckedAt': new Date() }
            }
          );
        } catch (error) {
          console.error('Error in monitoring interval:', error);
        }
      }
      monitor()
      const monitoringInterval = setInterval(monitor, intervalMinutes * 60 * 1000);

      // Stop monitoring after totalWindowHours
      setTimeout(() => {
        clearInterval(monitoringInterval);
        console.log('expired')
        // Mark as failed if still pending
        Hackathon.updateOne(
          { _id: hackathonId, registeredStudents: { $elemMatch: { student: userId, confirmationStatus: 'pending' } } },
          { $set: { 'registeredStudents.$.confirmationStatus': 'failed' } }
        ).catch(() => { });
      }, totalWindowHours * 60 * 60 * 1000);

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
