import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function PATCH(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const { status } = await request.json();

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const requesterRole = decoded.role;
    if (!['IT Owner', 'HR Manager', 'Manager'].includes(requesterRole)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, managerId: true } },
        leaveType: { select: { name: true, isEmergency: true } }
      }
    });

    if (!leaveRequest) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    // Manager can only approve for their direct reports
    if (requesterRole === 'Manager' && leaveRequest.user.managerId !== decoded.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (leaveRequest.status !== 'Pending') {
      return NextResponse.json({ message: `Already ${leaveRequest.status}` }, { status: 400 });
    }

    await prisma.leaveRequest.update({ where: { id }, data: { status } });

    // Deduct balance on approval (skip emergency)
    if (status === 'Approved' && !leaveRequest.leaveType.isEmergency) {
      const days = Math.ceil((new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      const year = new Date(leaveRequest.startDate).getFullYear();
      await prisma.leaveBalance.updateMany({
        where: { userId: leaveRequest.userId, leaveTypeId: leaveRequest.leaveTypeId, year },
        data: { balance: { decrement: days } }
      });
    }

    // Notify employee
    const { sendEmail } = await import('../../../../lib/email');
    const statusColor = status === 'Approved' ? '#10b981' : '#dc2626';
    const statusIcon = status === 'Approved' ? '✓' : '✗';
    await sendEmail({
      to: leaveRequest.user.email,
      subject: `Your leave request has been ${status}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:${statusColor};">${statusIcon} Leave Request ${status}</h2>
          <p>Hi ${leaveRequest.user.name},</p>
          <p>Your <strong>${leaveRequest.leaveType.name}</strong> leave request from
          <strong>${new Date(leaveRequest.startDate).toLocaleDateString('en-IN')}</strong> to
          <strong>${new Date(leaveRequest.endDate).toLocaleDateString('en-IN')}</strong>
          has been <strong style="color:${statusColor};">${status}</strong>.</p>
          <p style="color:#9ca3af;font-size:12px;">Reason you submitted: ${leaveRequest.reason}</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/employee/leave" style="display:inline-block;margin-top:1rem;padding:10px 20px;background:#1a1a1a;color:#fff;border-radius:8px;text-decoration:none;">View My Leaves</a>
        </div>
      `
    });

    await prisma.notification.create({
      data: {
        userId: leaveRequest.userId,
        title: `Leave Request ${status}`,
        content: `Your ${leaveRequest.leaveType.name} request from ${new Date(leaveRequest.startDate).toLocaleDateString('en-IN')} to ${new Date(leaveRequest.endDate).toLocaleDateString('en-IN')} was ${status.toLowerCase()}.`,
        type: 'leave'
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Leave PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
