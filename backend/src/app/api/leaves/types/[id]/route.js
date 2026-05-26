import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// PATCH — Update leave type
export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    if (!['HR Manager', 'IT Owner'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { name, quota, carryForward, advanceNotice, isEmergency } = await request.json();

    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const updated = await prisma.leaveType.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        quota: quota !== undefined ? parseInt(quota) : existing.quota,
        carryForward: carryForward !== undefined ? !!carryForward : existing.carryForward,
        advanceNotice: advanceNotice !== undefined ? parseInt(advanceNotice) : existing.advanceNotice,
        isEmergency: isEmergency !== undefined ? !!isEmergency : existing.isEmergency
      }
    });

    return NextResponse.json({ success: true, leaveType: updated });
  } catch (error) {
    console.error('LeaveType PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Remove a leave type (cascades balances and requests)
export async function DELETE(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    if (!['HR Manager', 'IT Owner'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Transactionally delete balances, requests, and the type
    await prisma.$transaction([
      prisma.leaveBalance.deleteMany({ where: { leaveTypeId: id } }),
      prisma.leaveRequest.deleteMany({ where: { leaveTypeId: id } }),
      prisma.leaveType.delete({ where: { id } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('LeaveType DELETE error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
