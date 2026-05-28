import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { REQUIRED_HOURS_PER_DAY, getWeekdaysInMonth, calculatePayrollBreakdown, calculateWorkedHoursInRange } from '../../../lib/payroll';

const prisma = new PrismaClient();

function INR(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

async function generatePayslipHtmlFile({
  runId,
  userId,
  employeeName,
  employeeEmail,
  month,
  year,
  workedHours,
  requiredHours,
  paidHolidayHours,
  gross,
  pf,
  esi,
  tds,
  lop,
  net,
}) {
  const dir = path.join(process.cwd(), 'public', 'payslips', runId);
  await fs.mkdir(dir, { recursive: true });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = `${monthNames[month - 1]} ${year}`;
  const generatedAt = new Date().toLocaleString('en-IN');

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Payslip - ${label}</title>
</head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;color:#111827;">
  <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
    <h2 style="margin:0 0 8px;color:#7B5EA7;">Antbox Payslip</h2>
    <p style="margin:0 0 16px;color:#6b7280;">Period: ${label}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
      <tr><td style="padding:6px 0;color:#6b7280;">Employee</td><td style="padding:6px 0;text-align:right;font-weight:600;">${employeeName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;text-align:right;">${employeeEmail || '-'}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Worked Hours</td><td style="padding:6px 0;text-align:right;">${workedHours.toFixed(2)} h</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Required Hours</td><td style="padding:6px 0;text-align:right;">${requiredHours.toFixed(2)} h</td></tr>
      <tr><td style="padding:6px 0;color:#6b7280;">Paid Holiday Credit</td><td style="padding:6px 0;text-align:right;">${paidHolidayHours.toFixed(2)} h</td></tr>
    </table>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:8px 0;color:#6b7280;">Gross Salary</td><td style="padding:8px 0;text-align:right;font-weight:600;">${INR(gross)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">PF</td><td style="padding:8px 0;text-align:right;color:#dc2626;">- ${INR(pf)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">ESI</td><td style="padding:8px 0;text-align:right;color:#dc2626;">- ${INR(esi)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">TDS</td><td style="padding:8px 0;text-align:right;color:#dc2626;">- ${INR(tds)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">LOP (Attendance Based)</td><td style="padding:8px 0;text-align:right;color:#dc2626;">- ${INR(lop)}</td></tr>
      <tr><td style="padding:10px 0;border-top:2px solid #7B5EA7;font-size:16px;font-weight:700;">Net Pay</td><td style="padding:10px 0;border-top:2px solid #7B5EA7;text-align:right;color:#059669;font-size:16px;font-weight:700;">${INR(net)}</td></tr>
    </table>
    <p style="margin-top:18px;color:#9ca3af;font-size:12px;">Generated on ${generatedAt}. This is a system-generated payslip.</p>
  </div>
</body>
</html>`;

  const filePath = path.join(dir, `${userId}.html`);
  await fs.writeFile(filePath, html, 'utf8');
  return `/payslips/${runId}/${userId}.html`;
}

// GET payroll runs or payslips
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const canViewAll = ['HR Manager', 'Admin', 'IT Owner'].includes(decoded.role);

    if (canViewAll) {
      // HR/Owner sees all runs and draft/finalized payslips
      const runs = await prisma.payrollRun.findMany({
        include: {
          payslips: {
            include: { user: { select: { name: true, email: true, role: true } } }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ runs });
    } else {
      // Employees see only their finalized payslips
      const payslips = await prisma.payslip.findMany({
        where: {
          userId: decoded.id,
        },
        include: {
          payrollRun: true
        },
        orderBy: [
          { payrollRun: { year: 'desc' } },
          { payrollRun: { month: 'desc' } },
          { createdAt: 'desc' }
        ]
      });
      return NextResponse.json({ payslips });
    }
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST â€” HR runs draft payroll calculation
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || !['HR Manager', 'Admin', 'IT Owner'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { month, year } = await request.json();
    if (!month || !year) {
      return NextResponse.json({ message: 'Month and year required' }, { status: 400 });
    }

    // 1. Check if finalized run already exists
    const existingRun = await prisma.payrollRun.findFirst({
      where: { month: parseInt(month), year: parseInt(year) }
    });

    if (existingRun && existingRun.status === 'Finalized') {
      return NextResponse.json({ message: 'Payroll for this month is already finalized.' }, { status: 400 });
    }

    // 2. Query all payroll-eligible active users (exclude Admin)
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: ['HR Manager', 'Employee'] }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        monthlySalary: true,
      }
    });

    const totalWorkdays = getWeekdaysInMonth(parseInt(year), parseInt(month));
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const now = new Date();
    const isCurrentMonth = now.getFullYear() === parseInt(year) && now.getMonth() + 1 === parseInt(month);
    const periodEnd = isCurrentMonth ? now : endOfMonth;
    const paidHolidays = await prisma.holidayCalendar.findMany({
      where: {
        deletedAt: null,
        date: { gte: startOfMonth, lte: endOfMonth }
      },
      select: { date: true }
    });
    const paidHolidayCount = paidHolidays.filter((h) => {
      const day = new Date(h.date).getDay();
      return day !== 0 && day !== 6;
    }).length;

    const draftPayslips = [];

    // Transactionally handle the payroll creation
    const payrollRun = await prisma.$transaction(async (tx) => {
      // Create or update payroll run
      let run = null;
      if (existingRun) {
        // Clear old draft payslips
        await tx.payslip.deleteMany({ where: { payrollRunId: existingRun.id } });
        run = await tx.payrollRun.update({
          where: { id: existingRun.id },
          data: { status: 'Draft', createdBy: decoded.name }
        });
      } else {
        run = await tx.payrollRun.create({
          data: { month: parseInt(month), year: parseInt(year), status: 'Draft', createdBy: decoded.name }
        });
      }

      for (const u of users) {
        const baseSalary = Number(u.monthlySalary || 0);

        // Deductions formulas
        // Active-hours based payroll:
        // requiredHours = (weekday working days * 9h)
        // payableHours = workedHours + (paid holidays * 9h)
        // lop = salary * max(0, requiredHours - payableHours) / requiredHours
        const monthLogs = await tx.attendanceLog.findMany({
          where: {
            userId: u.id,
            clockInTime: { lte: periodEnd },
            OR: [
              { clockOutTime: { gte: startOfMonth } },
              { clockOutTime: null }
            ]
          },
          select: { clockInTime: true, clockOutTime: true }
        });
        const workedHours = calculateWorkedHoursInRange(monthLogs, startOfMonth, periodEnd);

        const requiredHours = totalWorkdays * REQUIRED_HOURS_PER_DAY;
        const paidHolidayHours = paidHolidayCount * REQUIRED_HOURS_PER_DAY;
        const { gross, pf, esi, tds, lop, net } = calculatePayrollBreakdown({
          baseSalary,
          workedHours,
          requiredHours,
          paidHolidayHours,
        });
        const fileUrl = await generatePayslipHtmlFile({
          runId: run.id,
          userId: u.id,
          employeeName: u.name,
          employeeEmail: u.email,
          month: parseInt(month),
          year: parseInt(year),
          workedHours,
          requiredHours,
          paidHolidayHours,
          gross,
          pf,
          esi,
          tds,
          lop,
          net,
        });

        const payslip = await tx.payslip.create({
          data: {
            userId: u.id,
            payrollRunId: run.id,
            gross,
            pf,
            esi,
            tds,
            lop,
            net,
            fileUrl
          }
        });

        draftPayslips.push(payslip);
      }
      return run;
    });

    return NextResponse.json({ success: true, run: payrollRun, payslipsCount: draftPayslips.length });
  } catch (error) {
    console.error('Payroll calculations error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH â€” Admin finalizes the payroll run
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, status } = await request.json();
    if (!id || status !== 'Finalized') {
      return NextResponse.json({ message: 'Invalid run ID or status' }, { status: 400 });
    }

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { payslips: { include: { user: true } } }
    });

    if (!run) return NextResponse.json({ message: 'Payroll run not found' }, { status: 404 });
    if (run.status === 'Finalized') return NextResponse.json({ message: 'Already finalized' }, { status: 400 });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthStr = monthNames[run.month - 1];

    await prisma.$transaction(async (tx) => {
      // Finalize run
      await tx.payrollRun.update({
        where: { id },
        data: { status: 'Finalized', finalizedBy: decoded.name }
      });

      // Notify employees & send emails
      const { sendEmail } = await import('../../../lib/email');

      for (const slip of run.payslips) {
        // Create in-app notification
        await tx.notification.create({
          data: {
            userId: slip.userId,
            title: 'Payslip Released',
            content: `Your payslip for ${monthStr} ${run.year} is now ready for view/print.`,
            type: 'payroll'
          }
        });

        // Email notification using Antbox brand styling
        if (slip.user?.email) {
          await sendEmail({
            to: slip.user.email,
            subject: `Payslip Released - ${monthStr} ${run.year}`,
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #f0ece6;border-radius:12px;padding:2rem;">
                <h2 style="color:#7B5EA7;margin-bottom:1rem;">Payslip Released</h2>
                <p>Hi ${slip.user.name},</p>
                <p>Your salary payslip for <strong>${monthStr} ${run.year}</strong> has been finalized and processed.</p>
                <table style="width:100%;border-collapse:collapse;margin:1.5rem 0;font-size:0.875rem;">
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">Gross Salary</td><td style="font-weight:600;text-align:right;">â‚¹${slip.gross.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">PF Deduction</td><td style="color:#dc2626;text-align:right;">- â‚¹${slip.pf.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">TDS</td><td style="color:#dc2626;text-align:right;">- â‚¹${slip.tds.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">LOP (Absences)</td><td style="color:#dc2626;text-align:right;">- â‚¹${slip.lop.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:2px solid #7B5EA7;padding:8px;font-weight:700;"><td style="padding:8px 0;font-size:1rem;color:#111827;">Net Salary Disbursed</td><td style="font-size:1rem;color:#10b981;text-align:right;">â‚¹${slip.net.toLocaleString('en-IN')}</td></tr>
                </table>
                <p style="font-size:0.8125rem;color:#9ca3af;">Log in to the HR portal to print or download the full itemized payslip breakdown.</p>
              </div>
            `
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Finalize payroll error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
