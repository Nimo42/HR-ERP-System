import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET all leave types or leave requests
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    // Return leave types
    if (type === 'types') {
      const leaveTypes = await prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
      return NextResponse.json({ leaveTypes });
    }

    // Return balances
    if (type === 'balances') {
      const targetId = userId || decoded.id;
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const blockStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1;

      let accumulatedPaidLeaves = 0;
      let totalUnpaidLeavesInBlock = 0;

      for (let m = blockStartMonth; m <= currentMonth; m++) {
        const mStart = new Date(currentYear, m - 1, 1);
        const mEnd = new Date(currentYear, m, 0, 23, 59, 59, 999);
        
        const mLeaves = await prisma.leaveRequest.findMany({
          where: {
            userId: targetId,
            status: 'Approved',
            startDate: { lte: mEnd },
            endDate: { gte: mStart }
          }
        });

        let mTakenDays = 0;
        mLeaves.forEach(l => {
          const start = new Date(Math.max(l.startDate, mStart));
          const end = new Date(Math.min(l.endDate, mEnd));
          const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          mTakenDays += diff;
        });

        const earnedForM = 1;
        const paidLeavesAvailable = accumulatedPaidLeaves + earnedForM;
        const paidLeavesUsed = Math.min(mTakenDays, paidLeavesAvailable);
        const unpaidLeaves = Math.max(0, mTakenDays - paidLeavesAvailable);
        
        accumulatedPaidLeaves = paidLeavesAvailable - paidLeavesUsed;
        totalUnpaidLeavesInBlock += unpaidLeaves;
      }

      const balances = [
        {
          id: 'bal-paid',
          leaveType: { name: 'Paid Leave (Current Block)' },
          balance: accumulatedPaidLeaves,
          year: currentYear
        },
        {
          id: 'bal-unpaid',
          leaveType: { name: 'Unpaid Leaves (LOP) Taken' },
          balance: totalUnpaidLeavesInBlock,
          year: currentYear
        }
      ];

      return NextResponse.json({ balances });
    }

    // Return leave requests (role-scoped)
    const role = decoded.role;
    let whereClause = {};
    if (status) whereClause.status = status;

    if (role === 'Employee') {
      whereClause.userId = decoded.id;
    } else if (role === 'Manager') {
      // Manager sees requests from their direct reports
      const reports = await prisma.user.findMany({ where: { managerId: decoded.id }, select: { id: true } });
      whereClause.userId = { in: reports.map(r => r.id) };
    }
    // HR Manager and Admin see all

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, department: { select: { name: true } } } },
        leaveType: { select: { id: true, name: true, isEmergency: true } }
      },
      orderBy: [
        { leaveType: { isEmergency: 'desc' } }, // emergency leaves first
        { createdAt: 'asc' }                     // then oldest submission first
      ]
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Leave GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST â€” create a leave request
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { leaveTypeId, startDate, endDate, reason } = await request.json();

    if (!leaveTypeId || !startDate || !endDate || !reason) {
      return NextResponse.json({ message: 'All fields required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return NextResponse.json({ message: 'Start date must be before end date' }, { status: 400 });

    const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } });
    if (!leaveType) return NextResponse.json({ message: 'Invalid leave type' }, { status: 400 });

    // Advance notice check (skip for emergency)
    if (!leaveType.isEmergency && leaveType.advanceNotice > 0) {
      const daysUntilLeave = Math.ceil((start - new Date()) / (1000 * 60 * 60 * 24));
      if (daysUntilLeave < leaveType.advanceNotice) {
        return NextResponse.json({ message: `This leave type requires ${leaveType.advanceNotice} days advance notice.` }, { status: 400 });
      }
    }

    // Balance check
    const year = start.getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_leaveTypeId_year: { userId: decoded.id, leaveTypeId, year } }
    });

    const requestedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Overlap check
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        userId: decoded.id,
        status: { in: ['Pending', 'Approved'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json({ message: 'You already have a leave request overlapping these dates.' }, { status: 400 });
    }

    // Generate approval token for deep-link
    const crypto = await import('crypto');
    const approvalToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        userId: decoded.id,
        leaveTypeId,
        startDate: start,
        endDate: end,
        reason,
        token: approvalToken,
        tokenExpiry,
      },
      include: {
        user: { select: { name: true, email: true, manager: { select: { id: true, name: true, email: true } } } },
        leaveType: { select: { name: true } }
      }
    });

    // Send approval email to manager
    const manager = leaveRequest.user.manager;
    const approverIds = new Set();
    if (manager?.email) {
      const { sendEmail } = await import('../../../lib/email');
      const approveUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/leaves/action?token=${approvalToken}&action=approve`;
      const rejectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/leaves/action?token=${approvalToken}&action=reject`;

      await sendEmail({
        to: manager.email,
        subject: `Leave Request from ${leaveRequest.user.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Leave Request from ${leaveRequest.user.name}</h2>
            <table style="width:100%; border-collapse:collapse; margin: 1rem 0;">
              <tr><td style="padding:8px; color:#666;">Type</td><td style="padding:8px; font-weight:600;">${leaveRequest.leaveType.name}</td></tr>
              <tr style="background:#f9f8f7;"><td style="padding:8px; color:#666;">From</td><td style="padding:8px; font-weight:600;">${start.toLocaleDateString('en-IN')}</td></tr>
              <tr><td style="padding:8px; color:#666;">To</td><td style="padding:8px; font-weight:600;">${end.toLocaleDateString('en-IN')}</td></tr>
              <tr style="background:#f9f8f7;"><td style="padding:8px; color:#666;">Days</td><td style="padding:8px; font-weight:600;">${requestedDays}</td></tr>
              <tr><td style="padding:8px; color:#666;">Reason</td><td style="padding:8px;">${reason}</td></tr>
            </table>
            <div style="display:flex; gap:12px; margin-top:1.5rem;">
              <a href="${approveUrl}" style="padding:12px 24px; background:#10b981; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">âœ“ Approve</a>
              <a href="${rejectUrl}" style="padding:12px 24px; background:#dc2626; color:#fff; border-radius:8px; text-decoration:none; font-weight:600; display:inline-block;">âœ— Reject</a>
            </div>
            <p style="font-size:12px; color:#9ca3af; margin-top:1rem;">This link expires in 7 days. Log in to the HR portal to take further action.</p>
          </div>
        `
      });
    }

    if (manager?.id) {
      approverIds.add(manager.id);
    }

    const hrRecipients = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: ['HR Manager', 'Admin'] }
      },
      select: { id: true }
    });

    for (const recipient of hrRecipients) {
      approverIds.add(recipient.id);
    }

    const notificationPayloads = Array.from(approverIds).map((userId) => ({
      userId,
      title: 'New Leave Request',
      content: `${leaveRequest.user.name} submitted a ${leaveRequest.leaveType.name} request for ${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')}.`,
      type: 'leave'
    }));

    if (notificationPayloads.length > 0) {
      await prisma.notification.createMany({ data: notificationPayloads });
    }

    await prisma.notification.create({
      data: {
        userId: decoded.id,
        title: 'Leave Request Submitted',
        content: `Your ${leaveRequest.leaveType.name} request for ${start.toLocaleDateString('en-IN')} to ${end.toLocaleDateString('en-IN')} has been submitted and is awaiting review.`,
        type: 'leave'
      }
    });

    return NextResponse.json({ success: true, request: leaveRequest }, { status: 201 });
  } catch (error) {
    console.error('Leave POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
