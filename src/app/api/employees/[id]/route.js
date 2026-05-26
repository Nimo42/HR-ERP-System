import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const requesterRole = decoded.role;
    const requesterId = decoded.id;

    // Access control
    if (requesterRole === 'Employee' && requesterId !== id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (requesterRole === 'Manager') {
      // Must be a direct report
      const target = await prisma.user.findUnique({ where: { id }, select: { managerId: true } });
      if (!target || target.managerId !== requesterId) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
    }

    const employee = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true,
        joinDate: true, probationEnd: true, emergencyContact: true,
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, email: true } },
        directReports: { select: { id: true, name: true, role: true } },
        documents: { select: { id: true, type: true, fileUrl: true, uploadedAt: true } },
        bankDetails: {
          select: { accountName: true, accountNumber: true, ifscCode: true, bankName: true }
        },
        leaveBalances: {
          include: { leaveType: { select: { name: true } } }
        }
      }
    });

    if (!employee) return NextResponse.json({ message: 'Employee not found' }, { status: 404 });

    // Mask bank account number
    if (employee.bankDetails) {
      const acct = employee.bankDetails.accountNumber;
      employee.bankDetails.accountNumberMasked = acct.slice(0, 2) + '*'.repeat(Math.max(0, acct.length - 4)) + acct.slice(-4);
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    const requesterRole = decoded?.role;
    if (!['IT Owner', 'HR Manager'].includes(requesterRole)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const { name, joinDate, probationEnd, emergencyContact, departmentId, managerId, bankDetails, role } = body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (joinDate !== undefined) updateData.joinDate = joinDate ? new Date(joinDate) : null;
    if (probationEnd !== undefined) updateData.probationEnd = probationEnd ? new Date(probationEnd) : null;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (managerId !== undefined) updateData.managerId = managerId || null;
    if (role !== undefined) updateData.role = role;

    const updated = await prisma.user.update({ where: { id }, data: updateData });

    if (bankDetails) {
      await prisma.bankDetail.upsert({
        where: { userId: id },
        create: { userId: id, ...bankDetails },
        update: { ...bankDetails }
      });
    }

    return NextResponse.json({ success: true, employee: updated });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
