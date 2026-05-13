export type EmailProvider = 'sendgrid' | 'brevo';
export type SmsProvider = 'twilio';

interface SendEmailParams {
  provider: EmailProvider;
  apiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: SendEmailParams) {
  if (params.provider === 'sendgrid') {
    await sendWithSendGrid(params);
    return;
  }
  if (params.provider === 'brevo') {
    await sendWithBrevo(params);
    return;
  }
  throw new Error(`Unsupported email provider: ${params.provider}`);
}

async function sendWithSendGrid(params: SendEmailParams) {
  const body = {
    personalizations: [{ to: [{ email: params.toEmail }] }],
    from: { email: params.fromEmail },
    subject: params.subject,
    content: [{ type: 'text/html', value: params.html }],
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SendGrid email failed: ${response.status} ${errorBody}`);
  }
}

async function sendWithBrevo(params: SendEmailParams) {
  const body = {
    sender: { email: params.fromEmail },
    to: [{ email: params.toEmail }],
    subject: params.subject,
    htmlContent: params.html,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': params.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Brevo email failed: ${response.status} ${errorBody}`);
  }
}

export async function sendTwoFactorCode(
  provider: EmailProvider,
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  oneTimeCode: string
) {
  const subject = 'Your ClothCycle verification code';
  const html = `<p>Your ClothCycle verification code is <strong>${oneTimeCode}</strong>.</p><p>This code expires in 10 minutes.</p>`;
  return sendEmail({ provider, apiKey, fromEmail, toEmail, subject, html });
}

export async function sendPasswordResetLink(
  provider: EmailProvider,
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  resetLink: string
) {
  const subject = 'Reset your ClothCycle password';
  const html = `<p>Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, ignore this email.</p>`;
  return sendEmail({ provider, apiKey, fromEmail, toEmail, subject, html });
}

export async function sendSmsTwoFactorCode(
  provider: SmsProvider,
  options: {
    accountSid?: string;
    authToken?: string;
    fromNumber?: string;
  },
  toPhone: string,
  oneTimeCode: string
) {
  if (provider !== 'twilio') {
    throw new Error(`Unsupported SMS provider: ${provider}`);
  }

  if (!options.accountSid || !options.authToken || !options.fromNumber) {
    throw new Error('Twilio SMS is not configured');
  }

  const body = new URLSearchParams({
    To: toPhone,
    From: options.fromNumber,
    Body: `Your ClothCycle verification code is ${oneTimeCode}. It expires in 10 minutes.`,
  });

  const credentials = btoa(`${options.accountSid}:${options.authToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${options.accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio SMS failed: ${response.status} ${errorBody}`);
  }
}
