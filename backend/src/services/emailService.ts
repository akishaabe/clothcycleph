import { config } from '../config/env.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (config.email.provider === 'resend') {
    return sendResendEmail(options);
  }

  if (config.email.provider === 'brevo') {
    return sendBrevoEmail(options);
  }

  if (config.email.provider === 'sendgrid') {
    return sendSendGridEmail(options);
  }

  console.log('Dev email:', options);
  return { delivered: false, provider: 'console' };
}

export async function sendTwoFactorCode(to: string, code: string) {
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
  });
}

export async function sendPasswordResetLink(to: string, resetCode: string) {
  return sendEmail({
    to,
    subject: 'Reset your ClothCycle PH password',
    text: `Use this 6-digit password reset code to reset your password: ${resetCode}. It expires in 30 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #19221d;">
        <h2>Reset your ClothCycle PH password</h2>
        <p>Use this code in the app to reset your password:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700;">${resetCode}</p>
        <p>This code expires in 30 minutes. If this was not you, ignore this email.</p>
      </div>
    `,
  });
}

async function sendResendEmail(options: SendEmailOptions) {
  if (!config.email.resendApiKey) {
    throw new Error('RESEND_API_KEY is required when EMAIL_PROVIDER=resend');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.email.from,
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

async function sendBrevoEmail(options: SendEmailOptions) {
  if (!config.email.brevoApiKey) {
    throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo');
  }

  const sender = parseEmailAddress(config.email.from);
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': config.email.brevoApiKey,
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

async function sendSendGridEmail(options: SendEmailOptions) {
  if (!config.email.sendgridApiKey) {
    throw new Error('SENDGRID_API_KEY is required when EMAIL_PROVIDER=sendgrid');
  }

  const sender = parseEmailAddress(config.email.from);
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.email.sendgridApiKey}`,
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
