import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET â€” audit log entries with filters
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : 50;

    // We'll synthesize an audit log from real DB events since we don't have an audit_logs table yet.
    // Pull most recent activity across key entities.
    const [recentLeaves, recentPayrolls, recentUsers, recentNotifications, allUsers] = await Promise.all([
      prisma.leaveRequest.findMany({
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: { user: { select: { name: true, role: true } }, leaveType: { select: { name: true } } }
      }),
      prisma.payrollRun.findMany({
        take: 10,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.user.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        where: { NOT: { id: decoded.id } },
        select: { id: true, name: true, role: true, createdAt: true }
      }),
      prisma.notification.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } }
      }),
      prisma.user.findMany({ select: { name: true, role: true } })
    ]);

    const events = [];
    const roleByName = new Map(allUsers.map(u => [u.name, u.role]));

    recentLeaves.forEach(l => {
      events.push({
        id: `leave-${l.id}`,
        timestamp: l.updatedAt,
        actor: l.user.name,
        actorRole: l.user.role,
        action: `Leave ${l.status.toLowerCase()}`,
        entity: `${l.leaveType.name} request`,
        entityType: 'leave',
        outcome: 'success'
      });
    });

    recentPayrolls.forEach(p => {
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const actor = p.finalizedBy || p.createdBy || 'System';
      const actorRole = roleByName.get(actor) || (p.finalizedBy ? 'Admin' : 'HR Manager');
      events.push({
        id: `payroll-${p.id}`,
        timestamp: p.updatedAt,
        actor,
        actorRole,
        action: p.status === 'Finalized' ? 'Payroll finalised' : 'Payroll draft created',
        entity: `${monthNames[p.month - 1]} ${p.year} payroll`,
        entityType: 'payroll',
        outcome: 'success'
      });
    });

    recentUsers.forEach(u => {
      events.push({
        id: `user-${u.id}`,
        timestamp: u.createdAt,
        actor: 'System',
        actorRole: 'System',
        action: 'Account created',
        entity: `${u.name} (${u.role})`,
        entityType: 'account',
        outcome: 'success'
      });
    });

    recentNotifications.forEach(n => {
      events.push({
        id: `notif-${n.id}`,
        timestamp: n.createdAt,
        actor: 'System',
        actorRole: 'System',
        action: n.title,
        entity: n.user?.name || 'User',
        entityType: 'notification',
        outcome: 'success'
      });
    });

    // Sort by timestamp descending
    events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return NextResponse.json({ logs: events.slice(0, limit) });
  } catch (error) {
    console.error('Audit log GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
