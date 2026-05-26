import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token and new password are required' }, { status: 400 });
    }

    // Hash the incoming token to match the database stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and unexpired date
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date(), // must be greater than current time
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Password reset token is invalid or has expired.' },
        { status: 400 }
      );
    }

    // Check if new password is the same as the current password
    const isSameAsOld = await bcrypt.compare(password, user.password);
    if (isSameAsOld) {
      return NextResponse.json(
        { message: 'New password cannot be the same as your current password.' },
        { status: 400 }
      );
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return NextResponse.json({ message: 'Password has been successfully reset.' });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
