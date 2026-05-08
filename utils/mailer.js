const nodemailer = require('nodemailer');

let cachedTransporter;

const parseBoolean = (value) => String(value).toLowerCase() === 'true';

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
  }

  cachedTransporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: parseBoolean(SMTP_SECURE),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return cachedTransporter;
};

const sendPasswordResetOtpEmail = async ({ to, name, otp, expiresInMinutes }) => {
  const transporter = getTransporter();
  const from = process.env.MAIL_FROM || process.env.SMTP_USER;

  const subject = 'MarketHub password reset OTP';
  const text = [
    `Hi ${name || 'there'},`,
    '',
    `Your MarketHub password reset OTP is ${otp}.`,
    `This code expires in ${expiresInMinutes} minutes.`,
    '',
    'If you did not request a password reset, please ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">MarketHub password reset</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Use the OTP below to reset your MarketHub account password:</p>
      <div style="display: inline-block; margin: 12px 0; padding: 12px 18px; border-radius: 12px; background: #0f7a42; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 4px;">
        ${otp}
      </div>
      <p>This code expires in <strong>${expiresInMinutes} minutes</strong>.</p>
      <p>If you did not request this password reset, you can safely ignore this email.</p>
    </div>
  `;

  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendPasswordResetOtpEmail,
};
