import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const role = decoded.role;
    const userId = decoded.id;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const stats = {};

    if (role === 'IT Owner') {
      const headcount = await prisma.user.count({ where: { deletedAt: null } });
      const deptCount = await prisma.department.count({ where: { deletedAt: null } });
      const locationCount = await prisma.location.count({ where: { deletedAt: null } });
      const setupComplete = await prisma.orgSetting.findUnique({ where: { key: 'setupComplete' } });

      stats.headcount = headcount;
      stats.deptCount = deptCount;
      stats.locationCount = locationCount;
      stats.setupComplete = setupComplete?.value === 'true';
      stats.systemHealth = 'Healthy';
      stats.pendingPayroll = headcount * 45000; // Mock salary estimate
    } 
    else if (role === 'HR Manager') {
      const pendingLeaves = await prisma.leaveRequest.count({ where: { status: 'Pending' } });
      
      const onLeaveToday = await prisma.leaveRequest.count({
        where: {
          status: 'Approved',
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart }
        }
      });

      const next30Days = new Date();
      next30Days.setDate(next30Days.getDate() + 30);
      const probationEndings = await prisma.user.count({
        where: {
          probationEnd: {
            gte: todayStart,
            lte: next30Days
          }
        }
      });

      const documentExpiries = await prisma.document.count(); // Mock document counts

      const lateArrivals = await prisma.attendanceLog.count({
        where: {
          clockInTime: { gte: todayStart, lte: todayEnd },
          late: true
        }
      });

      const overtimeCount = await prisma.attendanceLog.count({
        where: {
          clockInTime: { gte: startOfMonth },
          overtime: true
        }
      });

      // Compute department attendance rate
      const departments = await prisma.department.findMany({
        where: { deletedAt: null },
        include: { users: { select: { id: true } } }
      });

      const deptRates = [];
      const totalWorkdays = 20; // estimate for rate calculation

      for (const dept of departments) {
        const uids = dept.users.map(u => u.id);
        const punchesCount = await prisma.attendanceLog.count({
          where: {
            userId: { in: uids },
            clockInTime: { gte: startOfMonth }
          }
        });
        
        const rate = uids.length > 0 
          ? Math.min(100, Math.round((punchesCount / (uids.length * totalWorkdays)) * 100))
          : 0;

        deptRates.push({
          name: dept.name,
          rate
        });
      }

      stats.pendingLeaves = pendingLeaves;
      stats.onLeaveToday = onLeaveToday;
      stats.probationEndings = probationEndings;
      stats.documentExpiries = documentExpiries;
      stats.lateArrivals = lateArrivals;
      stats.overtimeCount = overtimeCount;
      stats.deptRates = deptRates;
    } 
    else if (role === 'Manager') {
      const reports = await prisma.user.findMany({
        where: { managerId: userId, deletedAt: null },
        select: { id: true }
      });
      const rids = reports.map(r => r.id);

      const teamPresent = await prisma.attendanceLog.count({
        where: {
          userId: { in: rids },
          clockInTime: { gte: todayStart, lte: todayEnd }
        }
      });

      const teamOnLeave = await prisma.leaveRequest.count({
        where: {
          userId: { in: rids },
          status: 'Approved',
          startDate: { lte: todayEnd },
          endDate: { gte: todayStart }
        }
      });

      const teamAbsent = Math.max(0, rids.length - teamPresent - teamOnLeave);

      const pendingLeaves = await prisma.leaveRequest.count({
        where: {
          userId: { in: rids },
          status: 'Pending'
        }
      });

      stats.teamPresent = teamPresent;
      stats.teamAbsent = teamAbsent;
      stats.teamOnLeave = teamOnLeave;
      stats.pendingLeaves = pendingLeaves;
      stats.totalReports = rids.length;
    } 
    else if (role === 'Employee') {
      const balances = await prisma.leaveBalance.findMany({
        where: { userId, year: todayStart.getFullYear() },
        include: { leaveType: true }
      });

      const personalLogs = await prisma.attendanceLog.findMany({
        where: {
          userId,
          clockInTime: { gte: startOfMonth }
        }
      });

      const presentDays = personalLogs.length;
      const lateCount = personalLogs.filter(l => l.late).length;
      
      let totalHours = 0;
      personalLogs.forEach(l => {
        if (l.clockInTime && l.clockOutTime) {
          totalHours += (new Date(l.clockOutTime) - new Date(l.clockInTime)) / (1000 * 60 * 60);
        }
      });

      const nextPayslipDate = new Date(todayStart.getFullYear(), todayStart.getMonth() + 1, 1)
        .toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

      stats.leaveBalances = balances.map(b => ({
        name: b.leaveType.name,
        balance: b.balance
      }));
      stats.presentDays = presentDays;
      stats.lateCount = lateCount;
      stats.totalHours = Math.round(totalHours * 10) / 10;
      stats.nextPayslipDate = nextPayslipDate;
    }

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
