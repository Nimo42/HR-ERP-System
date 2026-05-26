import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET active punches for user
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || decoded.id;

    // A Manager can view reports' logs, HR can see everyone.
    if (userId !== decoded.id && !['HR Manager', 'Admin', 'Manager'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId,
        clockInTime: { gte: startOfMonth }
      },
      orderBy: { clockInTime: 'desc' }
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST clock-in / clock-out with face verification
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const actor = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true, faceEnrolled: true, faceEmbedding: true, name: true }
    });

    if (!actor) return NextResponse.json({ message: 'User not found' }, { status: 404 });

    const { workLocation, liveEmbedding, targetUserId } = await request.json(); // "Office" or "Remote"
    if (!workLocation) return NextResponse.json({ message: 'Work location is required' }, { status: 400 });

    const isManualOverride = !!targetUserId && targetUserId !== decoded.id;
    let attendanceUserId = decoded.id;
    let attendanceUserName = actor.name;
    let attendanceUserRole = actor.role;

    if (isManualOverride) {
      if (!['Admin', 'HR Manager'].includes(actor.role)) {
        return NextResponse.json({ message: 'Only Admin/HR can perform manual attendance overrides' }, { status: 403 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true, role: true, name: true }
      });
      if (!targetUser) return NextResponse.json({ message: 'Target user not found' }, { status: 404 });

      if (actor.role === 'Admin' && targetUser.role !== 'HR Manager') {
        return NextResponse.json({ message: 'Admin can manually punch only HR Manager accounts' }, { status: 403 });
      }
      if (actor.role === 'HR Manager' && targetUser.role !== 'Employee') {
        return NextResponse.json({ message: 'HR Manager can manually punch only Employee accounts' }, { status: 403 });
      }

      attendanceUserId = targetUser.id;
      attendanceUserName = targetUser.name;
      attendanceUserRole = targetUser.role;
    }

    // Self punch flow: HR and Employee MUST pass face verification.
    if (!isManualOverride && ['HR Manager', 'Employee'].includes(actor.role)) {
      if (!actor.faceEnrolled || !actor.faceEmbedding) {
        return NextResponse.json({ message: 'Face not enrolled yet. Please complete enrollment first.' }, { status: 400 });
      }

      if (!liveEmbedding || !Array.isArray(liveEmbedding) || liveEmbedding.length !== 128) {
        return NextResponse.json({ message: 'Invalid face scan data. Please scan again.' }, { status: 400 });
      }

      // Compute Euclidean Distance
      const storedEmbedding = JSON.parse(actor.faceEmbedding);
      let sumOfSquares = 0;
      for (let i = 0; i < 128; i++) {
        const diff = storedEmbedding[i] - liveEmbedding[i];
        sumOfSquares += diff * diff;
      }
      const distance = Math.sqrt(sumOfSquares);

      // Threshold check (standard Euclidean faceNet threshold = 0.6)
      if (distance >= 0.6) {
        return NextResponse.json({ message: 'Face not recognized. Please scan in good lighting and try again.' }, { status: 401 });
      }
    }

    // Check for active clock-in
    const activeLog = await prisma.attendanceLog.findFirst({
      where: {
        userId: attendanceUserId,
        clockOutTime: null
      }
    });

    const now = new Date();

    if (activeLog) {
      // Clock Out
      const diffMs = now - new Date(activeLog.clockInTime);
      const hoursWorked = diffMs / (1000 * 60 * 60);
      const overtime = hoursWorked > 9.0; // Overtime auto-flagged if hours exceed 9h threshold

      const updatedLog = await prisma.attendanceLog.update({
        where: { id: activeLog.id },
        data: {
          clockOutTime: now,
          overtime
        }
      });

      if (isManualOverride) {
        await prisma.notification.create({
          data: {
            userId: attendanceUserId,
            title: 'Manual Clock-Out Recorded',
            content: `${actor.name} (${actor.role}) clocked you out manually.`,
            type: 'attendance'
          }
        });
      }

      
      // If required active hours are not completed, auto-email the employee.
      if (hoursWorked < 9) {
        const targetUser = await prisma.user.findUnique({ where: { id: attendanceUserId }, select: { email: true, name: true } });
        if (targetUser?.email) {
          try {
            const { sendEmail } = await import('../../../lib/email');
            const shortBy = (9 - hoursWorked).toFixed(2);
            await sendEmail({
              to: targetUser.email,
              subject: 'Attendance Alert: Required Active Hours Not Met',
              html: `
                <p>Hi ${targetUser.name || 'there'},</p>
                <p>Your active work time today was <strong>${hoursWorked.toFixed(2)}h</strong>, which is below the required 9h.</p>
                <p>You are short by <strong>${shortBy}h</strong>.</p>
                <p>Please review your attendance logs if this is unexpected.</p>
              `
            });
          } catch (mailErr) {
            console.error('Short-hours mail failed:', mailErr?.message || mailErr);
          }
        }
      }
      return NextResponse.json({ success: true, action: 'clock-out', log: updatedLog, manualOverride: isManualOverride, targetUserName: attendanceUserName });
    } else {
      // Clock In
      // Auto-flag late if clock in is after 9:30 AM local time
      const hour = now.getHours();
      const minute = now.getMinutes();
      const late = (hour > 9) || (hour === 9 && minute > 30);

      const newLog = await prisma.attendanceLog.create({
        data: {
          userId: attendanceUserId,
          clockInTime: now,
          workLocation,
          late
        }
      });

      if (isManualOverride) {
        await prisma.notification.create({
          data: {
            userId: attendanceUserId,
            title: 'Manual Clock-In Recorded',
            content: `${actor.name} (${actor.role}) clocked you in manually.`,
            type: 'attendance'
          }
        });
      }

      return NextResponse.json({ success: true, action: 'clock-in', log: newLog, manualOverride: isManualOverride, targetUserName: attendanceUserName }, { status: 201 });
    }
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ message: 'Internal server error: ' + error.message }, { status: 500 });
  }
}

