const axios = require('axios');
const nodemailer = require('nodemailer');

const WEBHOOK_URL = process.env.FACULTY_WEBHOOK_URL;
const EMAIL_NOTIFIER_ENABLED = process.env.EMAIL_NOTIFIER_ENABLED === 'true';
const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@hackhub.local';
const EMAIL_TO = process.env.FACULTY_NOTIFY_EMAIL;

let transporter;
if (EMAIL_NOTIFIER_ENABLED && process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });
}

async function notifyRegistrationConfirmed(payload) {
  const { hackathonId, userId, platform, email } = payload;

  // Webhook
  if (WEBHOOK_URL) {
    try {
      await axios.post(WEBHOOK_URL, {
        type: 'registration_confirmed',
        hackathonId,
        userId,
        platform,
        email
      }, { timeout: 5000 });
    } catch (_) {}
  }

  // Email
  if (EMAIL_NOTIFIER_ENABLED && transporter && EMAIL_TO) {
    try {
      await transporter.sendMail({
        from: EMAIL_FROM,
        to: EMAIL_TO,
        subject: `Registration confirmed (${platform}) - ${hackathonId}`,
        text: `Student ${userId} confirmed for hackathon ${hackathonId} on ${platform}.
Subject: ${email?.subject || ''}
From: ${email?.from || ''}`
      });
    } catch (_) {}
  }
}

module.exports = {
  notifyRegistrationConfirmed
};


