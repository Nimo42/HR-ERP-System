import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
const normalizeActorRole = (role) => {
  if (!role) return 'system';
  const r = String(role).toLowerCase();
  if (r === 'admin') return 'admin';
  if (r === 'hr manager' || r === 'hr') return 'hr';
  if (r === 'employee') return 'employee';
  return 'system';
};

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return new Response('Unauthorized', { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return new Response('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'full') {
      // Export key tables as JSON
      const users = await prisma.user.findMany();
      const departments = await prisma.department.findMany();
      const leaveTypes = await prisma.leaveType.findMany();
      const leaves = await prisma.leaveRequest.findMany();
      const attendance = await prisma.attendanceLog.findMany();
      const payrolls = await prisma.payrollRun.findMany();
      const payslips = await prisma.payslip.findMany();
      const announcements = await prisma.announcement.findMany();
      
      const dbDump = { users, departments, leaveTypes, leaves, attendance, payrolls, payslips, announcements };
      return new Response(JSON.stringify(dbDump, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="antbox_full_dump.json"'
        }
      });
    }

    if (type === 'audit') {
      // Fetch data to build audit
      const [recentLeaves, recentPayrolls, recentUsers, recentNotifications, allUsers] = await Promise.all([
        prisma.leaveRequest.findMany({ include: { user: { select: { name: true, role: true } }, leaveType: { select: { name: true } } } }),
        prisma.payrollRun.findMany({}),
        prisma.user.findMany({ select: { id: true, name: true, role: true, createdAt: true } }),
        prisma.notification.findMany({ include: { user: { select: { name: true } } } }),
        prisma.user.findMany({ select: { name: true, role: true } })
      ]);

      const events = [];
      const roleByName = new Map(allUsers.map(u => [u.name, u.role]));
      recentLeaves.forEach(l => {
        events.push({ timestamp: l.updatedAt, actor: l.user?.name || 'Unknown', actorRole: l.user?.role || '', action: `Leave ${l.status.toLowerCase()}`, entity: `${l.leaveType?.name || 'Leave'} request`, entityType: 'leave', outcome: 'success' });
      });
      recentPayrolls.forEach(p => {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const actor = p.finalizedBy || p.createdBy || 'System';
        const actorRole = roleByName.get(actor) || (p.finalizedBy ? 'Admin' : 'HR Manager');
        events.push({ timestamp: p.updatedAt, actor, actorRole, action: p.status === 'Finalized' ? 'Payroll finalised' : 'Payroll draft created', entity: `${monthNames[p.month - 1]} ${p.year} payroll`, entityType: 'payroll', outcome: 'success' });
      });
      recentUsers.forEach(u => {
        events.push({ timestamp: u.createdAt, actor: 'System', actorRole: 'System', action: 'Account created', entity: `${u.name} (${u.role})`, entityType: 'account', outcome: 'success' });
      });
      recentNotifications.forEach(n => {
        events.push({ timestamp: n.createdAt, actor: 'System', actorRole: 'System', action: n.title, entity: n.user?.name || 'User', entityType: 'notification', outcome: 'success' });
      });

      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Build CSV
      let csv = 'Timestamp,Actor,Actor Role,Action,Entity,Entity Type,Outcome\n';
      events.forEach(e => {
        csv += `${csvEscape(new Date(e.timestamp).toISOString())},${csvEscape(e.actor)},${csvEscape(normalizeActorRole(e.actorRole))},${csvEscape(e.action)},${csvEscape(e.entity)},${csvEscape(e.entityType)},${csvEscape(e.outcome)}\n`;
      });

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="antbox_audit_log.csv"'
        }
      });
    }

    if (type === 'payroll') {
      const payslips = await prisma.payslip.findMany({
        include: {
          user: { select: { name: true, email: true, role: true, employeeId: true } },
          payrollRun: true
        },
        orderBy: [{ payrollRun: { year: 'desc' } }, { payrollRun: { month: 'desc' } }, { createdAt: 'desc' }]
      });
      let csv = 'Payroll Run,Run Status,Employee ID,Employee,Email,Role,Gross,PF,ESI,TDS,LOP,Net\n';
      payslips.forEach(p => {
        const runLabel = p.payrollRun ? `${p.payrollRun.month}/${p.payrollRun.year}` : '';
        csv += `${csvEscape(runLabel)},${csvEscape(p.payrollRun?.status || '')},${csvEscape(p.user?.employeeId || '')},${csvEscape(p.user?.name || 'Unknown')},${csvEscape(p.user?.email || '')},${csvEscape(p.user?.role || '')},${csvEscape(p.gross)},${csvEscape(p.pf)},${csvEscape(p.esi)},${csvEscape(p.tds)},${csvEscape(p.lop)},${csvEscape(p.net)}\n`;
      });
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="antbox_payroll_master.csv"'
        }
      });
    }

    return new Response('Invalid type', { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
