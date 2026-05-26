import nodemailer from 'nodemailer';

// Reuse the transporter to avoid creating new connections
let transporter;

export async function getEmailTransporter() {
  if (transporter) return transporter;

  // Use real credentials in production
  if (process.env.NODE_ENV === 'production' || process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return transporter;
  }

  // Fallback to Ethereal for local development testing
  const testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: testAccount.user, // generated ethereal user
      pass: testAccount.pass, // generated ethereal password
    },
  });

  console.log('Ethereal Email transporter created for local testing.');
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = await getEmailTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Antbox HR" <noreply@theantbox.com>';
    
    const info = await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html
    });

    console.log(`Email sent successfully to ${to}. MessageID: ${info.messageId}`);
    
    // Log preview URL if using Ethereal local testing
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('Ethereal Test Mail Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Error sending email via SMTP:', error);
    throw error;
  }
}

