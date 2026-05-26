import { config, type AppConfig } from '../config/env.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: SendEmailOptions, appConfig: AppConfig = config) {
  const provider = String(appConfig.email.provider || 'console').toLowerCase();

  if (provider === 'resend') {
    validateEmailConfig(provider, appConfig.email.resendApiKey);
    return sendResendEmail(options, appConfig);
  }

  if (provider === 'brevo') {
    validateEmailConfig(provider, appConfig.email.brevoApiKey);
    return sendBrevoEmail(options, appConfig);
  }

  if (provider === 'sendgrid') {
    validateEmailConfig(provider, appConfig.email.sendgridApiKey);
    return sendSendGridEmail(options, appConfig);
  }

  if (appConfig.server.env === 'production') {
    console.warn('Email delivery skipped: EMAIL_PROVIDER is not configured for production.');
    throw new Error('Email delivery is not configured. Please contact support.');
  }

  console.log('Dev email:', {
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
  return { delivered: false, provider: 'console' };
}

function validateEmailConfig(provider: string, apiKey?: string) {
  if (apiKey) {
    return;
  }

  const requiredKey =
    provider === 'brevo'
      ? 'BREVO_API_KEY'
      : provider === 'sendgrid'
        ? 'SENDGRID_API_KEY'
        : 'RESEND_API_KEY';

  console.warn(`Email delivery skipped: EMAIL_PROVIDER=${provider} requires ${requiredKey}.`);
  throw new Error(`Email delivery is not configured. Missing ${requiredKey}.`);
}

export async function sendTwoFactorCode(to: string, code: string, appConfig: AppConfig = config) {
  return sendEmail({
    to,
    subject: 'Your ClothCycle PH verification code',
    text: `Your ClothCycle PH verification code is ${code}. It expires in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #19221d;">
        <h2>ClothCycle PH verification</h2>
        <p>Use this code to finish signing in:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${code}</p>
        <p>This code expires in 10 minutes. If this was not you, ignore this email.</p>
      </div>
    `,
  }, appConfig);
}

export async function sendPasswordResetLink(to: string, resetCode: string, appConfig: AppConfig = config) {
  return sendEmail({
    to,
    subject: 'Reset your ClothCycle PH password',
    text: `Use this 6-digit verification code to reset your password: ${resetCode}. It expires in 15 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #19221d;">
        <h2>Reset your ClothCycle PH password</h2>
        <p>Use this verification code in the app to reset your password:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${resetCode}</p>
        <p>This code expires in 15 minutes. If this was not you, ignore this email.</p>
      </div>
    `,
  }, appConfig);
}

async function sendResendEmail(options: SendEmailOptions, appConfig: AppConfig) {
  if (!appConfig.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appConfig.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: appConfig.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }

  return { delivered: true, provider: 'resend' };
}

function parseEmailAddress(value: string) {
  const match = value.match(/^(.*?)\s*<(.+)>$/);

  if (!match) {
    return { name: 'ClothCycle PH', email: value };
  }

  return {
    name: match[1].trim(),
    email: match[2].trim(),
  };
}

async function sendBrevoEmail(options: SendEmailOptions, appConfig: AppConfig) {
  if (!appConfig.email.brevoApiKey) {
    throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo');
  }

  const sender = parseEmailAddress(appConfig.email.from);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': appConfig.email.brevoApiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: options.to }],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }

  return { delivered: true, provider: 'brevo' };
}

async function sendSendGridEmail(options: SendEmailOptions, appConfig: AppConfig) {
  if (!appConfig.email.sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
  }

  const sender = parseEmailAddress(appConfig.email.from);
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appConfig.email.sendgridApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: sender,
      subject: options.subject,
      content: [
        { type: 'text/plain', value: options.text },
        { type: 'text/html', value: options.html },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Email delivery failed: ${errorText}`);
  }

  return { delivered: true, provider: 'sendgrid' };
}
