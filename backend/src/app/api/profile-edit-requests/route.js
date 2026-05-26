import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET â€” list profile edit requests (HR/Admin see all pending; employees see their own)
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'Pending';

    let where = { status };
    if (!['HR Manager', 'Admin'].includes(decoded.role)) {
      // Employees only see their own
      where.userId = decoded.id;
    }

    const requests = await prisma.profileEditRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Profile edit requests GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST â€” employee submits a profile edit request
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const body = await request.json();
    const { fields } = body;
    // fields: array of { field, oldValue, newValue, reason }

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ message: 'No fields to update' }, { status: 400 });
    }

    const created = [];
    for (const f of fields) {
      const { field, oldValue, newValue, reason } = f;
      if (!field || newValue === undefined || !reason) continue;

      const req = await prisma.profileEditRequest.create({
        data: {
          userId: decoded.id,
          field,
          oldValue: String(oldValue ?? ''),
          newValue: String(newValue ?? ''),
          reason,
          status: 'Pending'
        }
      });
      created.push(req);
    }

    // Notify all HR Managers
    const hrUsers = await prisma.user.findMany({
      where: { role: { in: ['HR Manager', 'Admin'] } },
      select: { id: true }
    });
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hr.id,
          title: 'Profile Edit Request',
          content: `${decoded.name} has submitted ${created.length} profile field change request(s) for review.`,
          type: 'document'
        }
      });
    }

    return NextResponse.json({ success: true, created }, { status: 201 });
  } catch (error) {
    console.error('Profile edit requests POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH â€” HR/Admin approves or rejects a request
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    if (!['HR Manager', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, status } = await request.json();
    if (!id || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ message: 'ID and valid status required' }, { status: 400 });
    }

    const editRequest = await prisma.profileEditRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!editRequest) return NextResponse.json({ message: 'Request not found' }, { status: 404 });
    if (editRequest.status !== 'Pending') return NextResponse.json({ message: 'Already processed' }, { status: 400 });

    await prisma.$transaction(async (tx) => {
      // Update the request status
      await tx.profileEditRequest.update({ where: { id }, data: { status } });

      if (status === 'Approved') {
        const { field, newValue, userId } = editRequest;

        // Bank detail fields
        const bankFields = ['bankDetails.accountNumber', 'bankDetails.bankName', 'bankDetails.ifscCode', 'bankDetails.accountName'];
        if (bankFields.includes(field)) {
          const bankField = field.split('.')[1]; // e.g. "accountNumber"
          const existing = await tx.bankDetail.findUnique({ where: { userId } });
          if (existing) {
            await tx.bankDetail.update({ where: { userId }, data: { [bankField]: newValue } });
          } else {
            // Create bank detail with only this field - others blank
            const defaults = { accountNumber: '', bankName: '', ifscCode: '', accountName: '' };
            await tx.bankDetail.create({ data: { userId, ...defaults, [bankField]: newValue } });
          }
        } else {
          // Direct user field (e.g. "name")
          await tx.user.update({ where: { id: userId }, data: { [field]: newValue } });
        }
      }

      // Notify the employee
      await tx.notification.create({
        data: {
          userId: editRequest.userId,
          title: `Profile Edit ${status}`,
          content: `Your request to change "${editRequest.field}" has been ${status.toLowerCase()} by HR.`,
          type: 'document'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Profile edit requests PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
