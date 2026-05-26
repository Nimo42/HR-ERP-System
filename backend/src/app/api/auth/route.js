import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// The secret should be in env in production
const JWT_SECRET = process.env.JWT_SECRET || 'antbox-hr-super-secret-key-2024';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Prevent 500s when a legacy/malformed user row has no valid password hash.
    if (typeof user.password !== 'string' || user.password.length < 20) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(password, user.password);
    } catch {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.resetPasswordToken) {
      return NextResponse.json(
        {
          message: 'Password reset required before login.',
          requirePasswordReset: true,
          email: user.email
        },
        { status: 403 }
      );
    }

    // Role-based session timeout: 4h for HR/Admin, 8h for others
    const sessionHours = ['HR Manager', 'Admin'].includes(user.role) ? 4 : 8;

    // Create JWT token with role claim
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: `${sessionHours}h` }
    );

    // Role-based redirect
    const ROLE_REDIRECTS = {
      'Admin':   '/dashboard/it-owner',
      'HR Manager': '/dashboard/hr',
      'Manager':    '/dashboard/manager',
      'Employee':   '/dashboard/employee',
    };
    const redirectTo = ROLE_REDIRECTS[user.role] || '/dashboard/employee';

    const response = NextResponse.json({
      message: 'Logged in successfully',
      role: user.role,
      name: user.name,
      redirectTo,
    });

    // Set HTTP-only cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionHours * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
