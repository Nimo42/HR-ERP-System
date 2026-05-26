import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    const nextPassword = String(password || '');
    if (nextPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long.' }, { status: 400 });
    }
    if (!/[A-Z]/.test(nextPassword) || !/[a-z]/.test(nextPassword) || !/[0-9]/.test(nextPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(nextPassword)) {
      return NextResponse.json({
        message: 'Password must include uppercase, lowercase, number, and special character.'
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
    if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const isSameAsOld = await bcrypt.compare(nextPassword, user.password);
    if (isSameAsOld) {
      return NextResponse.json({ message: 'New password cannot be the same as your current password.' }, { status: 400 });
    }

    const newHashedPassword = await bcrypt.hash(nextPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'security',
        title: 'Password Updated',
        content: 'Your password was updated successfully.',
      }
    });

    return NextResponse.json({ message: 'Password has been successfully reset.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
