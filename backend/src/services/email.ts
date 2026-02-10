import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@yourpos.com';
const FROM_NAME = process.env.FROM_NAME || 'NetSuite POS';

interface InvitationEmailParams {
  to: string;
  inviterName: string;
  companyName: string;
  role: string;
  inviteToken: string;
}

export async function sendInvitationEmail({
  to,
  inviterName,
  companyName,
  role,
  inviteToken,
}: InvitationEmailParams): Promise<void> {
  const inviteUrl = `${FRONTEND_URL}/invite/${inviteToken}`;

  const roleDisplayName = {
    OWNER: 'Owner',
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    CASHIER: 'Cashier',
  }[role] || role;

  const subject = `You're invited to join ${companyName} on NetSuite POS`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation to ${companyName}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">NetSuite POS</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">You're Invited!</h2>

        <p style="font-size: 16px; color: #555;">
          <strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${roleDisplayName}</strong>.
        </p>

        <p style="font-size: 16px; color: #555;">
          Click the button below to accept your invitation and set up your account:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <p style="font-size: 14px; color: #888;">
          Or copy and paste this link into your browser:
          <br>
          <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 13px; color: #888; margin-bottom: 0;">
          This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} NetSuite POS. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
You're Invited to ${companyName}!

${inviterName} has invited you to join ${companyName} as a ${roleDisplayName}.

Click the link below to accept your invitation and set up your account:

${inviteUrl}

This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.

- The NetSuite POS Team
  `;

  if (resend) {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });
  } else {
    // Log for development when Resend is not configured
    console.log('='.repeat(60));
    console.log('EMAIL WOULD BE SENT (Resend not configured):');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Invite URL: ${inviteUrl}`);
    console.log('='.repeat(60));
  }
}

interface PasswordResetEmailParams {
  to: string;
  resetToken: string;
  firstName: string;
}

export async function sendPasswordResetEmail({
  to,
  resetToken,
  firstName,
}: PasswordResetEmailParams): Promise<void> {
  const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

  const subject = 'Reset your NetSuite POS password';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 28px;">NetSuite POS</h1>
      </div>

      <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>

        <p style="font-size: 16px; color: #555;">
          Hi ${firstName},
        </p>

        <p style="font-size: 16px; color: #555;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>

        <p style="font-size: 14px; color: #888;">
          Or copy and paste this link into your browser:
          <br>
          <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

        <p style="font-size: 13px; color: #888; margin-bottom: 0;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>

      <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
        <p>&copy; ${new Date().getFullYear()} NetSuite POS. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Password Reset Request

Hi ${firstName},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

- The NetSuite POS Team
  `;

  if (resend) {
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });
  } else {
    console.log('='.repeat(60));
    console.log('EMAIL WOULD BE SENT (Resend not configured):');
    console.log('='.repeat(60));
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('='.repeat(60));
  }
}
