import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET all leave types
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const leaveTypes = await prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ leaveTypes });
  } catch (error) {
    console.error('LeaveTypes GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST â€” Create a new leave type + populate initial balances for all users for current year
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    if (!['HR Manager', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { name, quota, carryForward, advanceNotice, isEmergency } = await request.json();

    if (!name || quota === undefined) {
      return NextResponse.json({ message: 'Name and Quota are required' }, { status: 400 });
    }

    const newType = await prisma.leaveType.create({
      data: {
        name,
        quota: parseInt(quota),
        carryForward: !!carryForward,
        advanceNotice: parseInt(advanceNotice || 0),
        isEmergency: !!isEmergency
      }
    });

    // Populate balances for all users for current year
    const currentYear = new Date().getFullYear();
    const users = await prisma.user.findMany({ select: { id: true } });

    if (users.length > 0) {
      await prisma.leaveBalance.createMany({
        data: users.map(user => ({
          userId: user.id,
          leaveTypeId: newType.id,
          balance: parseFloat(quota),
          year: currentYear
        })),
        skipDuplicates: true
      });
    }

    return NextResponse.json({ success: true, leaveType: newType }, { status: 201 });
  } catch (error) {
    console.error('LeaveTypes POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
