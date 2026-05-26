import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to get client IP
function getClientIp(request) {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return request.ip || '127.0.0.1';
}

// Helper to check if IP is in range/list
function isIpAllowed(ip, ipRange) {
  if (!ipRange) return true; // No restriction configured
  const allowedIps = ipRange.split(',').map(item => item.trim().toLowerCase());
  
  // Basic match (handles exact match like 127.0.0.1 or ::1 or localhost)
  const client = ip.toLowerCase();
  return allowedIps.some(allowed => {
    if (allowed === 'localhost') return ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(client);
    return client === allowed || client.startsWith(allowed); // Simple prefix or exact match
  });
}

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
    if (userId !== decoded.id && !['HR Manager', 'IT Owner', 'Manager'].includes(decoded.role)) {
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

// POST clock-in / clock-out
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { workLocation } = await request.json(); // "Office" or "Remote"
    if (!workLocation) return NextResponse.json({ message: 'Work location is required' }, { status: 400 });

    const ip = getClientIp(request);

    // IP Check for Office work location
    if (workLocation === 'Office') {
      const locations = await prisma.location.findMany({
        where: { ipRange: { not: null } }
      });
      // If there are office locations with IP constraints, verify
      if (locations.length > 0) {
        const allowed = locations.some(loc => isIpAllowed(ip, loc.ipRange));
        if (!allowed) {
          return NextResponse.json({
            message: `IP restricted. Your IP (${ip}) is not authorized for Office clock-in.`
          }, { status: 400 });
        }
      }
    }

    // Check for active clock-in
    const activeLog = await prisma.attendanceLog.findFirst({
      where: {
        userId: decoded.id,
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

      return NextResponse.json({ success: true, action: 'clock-out', log: updatedLog });
    } else {
      // Clock In
      // Auto-flag late if clock in is after 9:30 AM local time
      const hour = now.getHours();
      const minute = now.getMinutes();
      const late = (hour > 9) || (hour === 9 && minute > 30);

      const newLog = await prisma.attendanceLog.create({
        data: {
          userId: decoded.id,
          clockInTime: now,
          workLocation,
          ip,
          late
        }
      });

      return NextResponse.json({ success: true, action: 'clock-in', log: newLog }, { status: 201 });
    }
  } catch (error) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
