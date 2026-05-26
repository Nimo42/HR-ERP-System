import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

function authGuard(decoded) {
  if (!decoded || decoded.role !== 'Admin') return false;
  return true;
}

// GET - list all HR Managers
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!authGuard(decoded)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const hrs = await prisma.user.findMany({
      where: { role: 'HR Manager' },
      select: {
        id: true,
        name: true,
        email: true,
        monthlySalary: true,
        role: true,
        employeeId: true,
        createdAt: true,
        deletedAt: true,
        resetPasswordToken: true,
        resetPasswordExpires: true,
        attendanceLogs: {
          select: { clockInTime: true },
          orderBy: { clockInTime: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = hrs.map((hr) => {
      let status = 'Active';
      if (hr.deletedAt) status = 'Deactivated';
      else if (hr.resetPasswordToken && hr.resetPasswordExpires && new Date(hr.resetPasswordExpires) > new Date()) {
        status = 'Invited';
      }
      const lastLogin = hr.attendanceLogs[0]?.clockInTime || null;
      return {
        id: hr.id,
        name: hr.name,
        email: hr.email,
        monthlySalary: hr.monthlySalary,
        employeeId: hr.employeeId,
        status,
        createdAt: hr.createdAt,
        lastLogin
      };
    });

    return NextResponse.json({ hrManagers: result });
  } catch (error) {
    console.error('HR Managers GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST - create new HR Manager
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!authGuard(decoded)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { name, email, note, monthlySalary } = await request.json();
    if (!name || !email) return NextResponse.json({ message: 'Name and email required' }, { status: 400 });
    if (monthlySalary === undefined || monthlySalary === null || Number(monthlySalary) <= 0) {
      return NextResponse.json({ message: 'Monthly salary is required and must be greater than 0' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ message: 'Email already registered' }, { status: 400 });

    const tempPassword = crypto.randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);

    function generateRandomDigits(length) {
      let result = '';
      for (let i = 0; i < length; i++) result += Math.floor(Math.random() * 10).toString();
      return result;
    }

    let newEmployeeId = '';
    let existsId = true;
    while (existsId) {
      newEmployeeId = 'HR' + generateRandomDigits(4);
      const u = await prisma.user.findUnique({ where: { employeeId: newEmployeeId } });
      if (!u) existsId = false;
    }

    const newHR = await prisma.user.create({
      data: {
        name,
        email,
        role: 'HR Manager',
        password: hashedPassword,
        resetPasswordToken: hashedToken,
        resetPasswordExpires: tokenExpiration,
        employeeId: newEmployeeId,
        monthlySalary: Number(monthlySalary),
      }
    });

    await prisma.notification.create({
      data: {
        userId: newHR.id,
        type: 'invitation',
        title: 'HR Manager Invitation',
        content: `You have been invited to join as HR Manager.${note ? ` Note: ${note}` : ''} Please accept or decline this invitation.`,
      }
    });

    return NextResponse.json({
      success: true,
      hrManager: { id: newHR.id, name: newHR.name, email: newHR.email, status: 'Invited' }
    });
  } catch (error) {
    console.error('HR Manager POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - deactivate/reactivate HR Manager, resend invite
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!authGuard(decoded)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { id, action } = await request.json();
    if (!id || !action) return NextResponse.json({ message: 'id and action required' }, { status: 400 });

    const hr = await prisma.user.findUnique({ where: { id } });
    if (!hr || hr.role !== 'HR Manager') return NextResponse.json({ message: 'HR Manager not found' }, { status: 404 });

    if (action === 'deactivate') {
      await prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
      return NextResponse.json({ success: true, message: 'Account deactivated' });
    }

    if (action === 'reactivate') {
      await prisma.user.update({ where: { id }, data: { deletedAt: null } });
      return NextResponse.json({ success: true, message: 'Account reactivated' });
    }

    if (action === 'resend-invite') {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const tokenExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id },
        data: { resetPasswordToken: hashedToken, resetPasswordExpires: tokenExpiration }
      });

      await prisma.notification.create({
        data: {
          userId: hr.id,
          type: 'invitation',
          title: 'Invitation Resent',
          content: 'Your HR Manager invitation has been refreshed. Please accept or decline the invitation.',
        }
      });

      return NextResponse.json({ success: true, message: 'Invite resent' });
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('HR Manager PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
