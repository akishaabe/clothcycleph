import { config } from '../config/env.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(options: SendEmailOptions) {
  if (!config.email.resendApiKey) {
    console.log('Email provider not configured. Dev email:', options);
    return { delivered: false, provider: 'console' };
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

export async function sendPasswordResetLink(to: string, resetToken: string) {
  return sendEmail({
    to,
    subject: 'Reset your ClothCycle PH password',
    text: `Use this reset token to reset your password: ${resetToken}. It expires in 30 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #19221d;">
        <h2>Reset your ClothCycle PH password</h2>
        <p>Use this reset token in the app:</p>
        <p style="font-size: 18px; word-break: break-all; font-weight: 700;">${resetToken}</p>
        <p>This token expires in 30 minutes. If this was not you, ignore this email.</p>
      </div>
    `,
  });
}
