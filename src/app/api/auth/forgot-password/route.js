import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getEmailTransporter } from '@/lib/email';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // We don't want to expose whether an email exists or not, so we always return success
    if (!user) {
      return NextResponse.json({ message: 'If that email is in our database, we will send a password reset link to it.' });
    }

    // Generate a secure token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing it
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiration to 1 hour from now
    const tokenExpiration = new Date(Date.now() + 60 * 60 * 1000);

    // Save the hashed token and expiry to the user record
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: tokenExpiration,
      },
    });

    // Create the reset URL
    // In production, this should read from an environment variable like process.env.NEXT_PUBLIC_APP_URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

    // Send email
    const transporter = await getEmailTransporter();
    
    const info = await transporter.sendMail({
      from: '"Antbox HR" <noreply@theantbox.com>',
      to: user.email,
      subject: 'Password Reset Request',
      text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        ${resetUrl}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`,
      html: `
        <h3>Password Reset Request</h3>
        <p>You requested a password reset for your Antbox HR account.</p>
        <p>Click the link below to set a new password. This link will expire in 1 hour.</p>
        <a href="${resetUrl}">Reset Password</a>
        <br/><br/>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `
    });

    console.log('Message sent: %s', info.messageId);
    
    // If using ethereal, output the URL to preview the email
    if (info.messageId && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return NextResponse.json({ 
      message: 'If that email is in our database, we will send a password reset link to it.',
      // Only include the preview URL in the response for development mode
      previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : null
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
