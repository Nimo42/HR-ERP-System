import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET corrections list
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const role = decoded.role;
    let whereClause = {};

    if (role === 'Employee') {
      whereClause.userId = decoded.id;
    } else if (role === 'Manager') {
      const reports = await prisma.user.findMany({
        where: { managerId: decoded.id },
        select: { id: true }
      });
      whereClause.userId = { in: reports.map(r => r.id) };
    }
    // HR and IT Owner see all

    const corrections = await prisma.attendanceCorrection.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true } },
        attendanceLog: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ corrections });
  } catch (error) {
    console.error('Corrections GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST correction request
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { attendanceLogId, requestedClockIn, requestedClockOut, reason } = await request.json();

    if (!attendanceLogId || !reason) {
      return NextResponse.json({ message: 'Missing log ID or reason' }, { status: 400 });
    }

    const log = await prisma.attendanceLog.findUnique({
      where: { id: attendanceLogId }
    });

    if (!log || log.userId !== decoded.id) {
      return NextResponse.json({ message: 'Attendance log not found' }, { status: 404 });
    }

    const correction = await prisma.attendanceCorrection.create({
      data: {
        attendanceLogId,
        userId: decoded.id,
        requestedClockIn: requestedClockIn ? new Date(requestedClockIn) : null,
        requestedClockOut: requestedClockOut ? new Date(requestedClockOut) : null,
        reason,
        status: 'Pending'
      }
    });

    // Notify HR
    const hrUsers = await prisma.user.findMany({
      where: { role: 'HR Manager' },
      select: { id: true }
    });
    for (const hr of hrUsers) {
      await prisma.notification.create({
        data: {
          userId: hr.id,
          title: 'New Correction Request',
          content: `${decoded.name} has requested an attendance log correction.`,
          type: 'attendance'
        }
      });
    }

    return NextResponse.json({ success: true, correction }, { status: 201 });
  } catch (error) {
    console.error('Corrections POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH resolve correction request (HR / IT Owner)
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    if (!['HR Manager', 'IT Owner'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, status, note } = await request.json();

    if (!id || !['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ message: 'ID and valid status (Approved/Rejected) required' }, { status: 400 });
    }

    const correction = await prisma.attendanceCorrection.findUnique({
      where: { id },
      include: { attendanceLog: true }
    });

    if (!correction) {
      return NextResponse.json({ message: 'Correction request not found' }, { status: 404 });
    }

    if (correction.status !== 'Pending') {
      return NextResponse.json({ message: 'Request already processed' }, { status: 400 });
    }

    // Begin database transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Update correction status
      await tx.attendanceCorrection.update({
        where: { id },
        data: { status, note }
      });

      if (status === 'Approved') {
        const updatedClockIn = correction.requestedClockIn || correction.attendanceLog.clockInTime;
        const updatedClockOut = correction.requestedClockOut || correction.attendanceLog.clockOutTime;

        // Recalculate overtime & late flags
        let late = false;
        if (updatedClockIn) {
          const cin = new Date(updatedClockIn);
          late = (cin.getHours() > 9) || (cin.getHours() === 9 && cin.getMinutes() > 30);
        }

        let overtime = false;
        if (updatedClockIn && updatedClockOut) {
          const hours = (new Date(updatedClockOut) - new Date(updatedClockIn)) / (1000 * 60 * 60);
          overtime = hours > 9.0;
        }

        // Apply corrected times to the log
        await tx.attendanceLog.update({
          where: { id: correction.attendanceLogId },
          data: {
            clockInTime: updatedClockIn,
            clockOutTime: updatedClockOut,
            late,
            overtime
          }
        });
      }

      // Notify employee
      await tx.notification.create({
        data: {
          userId: correction.userId,
          title: `Correction Request ${status}`,
          content: `Your attendance correction request for log on ${new Date(correction.attendanceLog.clockInTime).toLocaleDateString('en-IN')} has been ${status.toLowerCase()}.${note ? ` Note: ${note}` : ''}`,
          type: 'attendance'
        }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Corrections PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
