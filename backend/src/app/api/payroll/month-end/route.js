import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { sendEmail } from '../../../../lib/email';
import { REQUIRED_HOURS_PER_DAY, getWeekdaysInMonth, calculatePayrollBreakdown } from '../../../../lib/payroll';

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
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Payslip - ${label}</title></head>
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

export async function POST(request) {
  try {
    const cronSecret = process.env.PAYROLL_CRON_SECRET;
    const providedSecret = request.headers.get('x-payroll-secret');
    if (!cronSecret || providedSecret !== cronSecret) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const force = Boolean(body.force);
    const now = new Date();
    const month = Number(body.month || now.getMonth() + 1);
    const year = Number(body.year || now.getFullYear());

    // Runs only on month-end unless forced
    const lastDay = new Date(year, month, 0).getDate();
    const today = now.getDate();
    if (!force && today !== lastDay) {
      return NextResponse.json({ success: true, skipped: true, reason: `Not month-end (${today}/${lastDay})` });
    }

    const existingRun = await prisma.payrollRun.findFirst({
      where: { month, year },
      include: { payslips: { include: { user: true } } }
    });

    if (existingRun && existingRun.status === 'Finalized') {
      return NextResponse.json({ success: true, skipped: true, reason: 'Already finalized', runId: existingRun.id });
    }

    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { in: ['HR Manager', 'Employee'] }
      },
      select: { id: true, name: true, email: true, monthlySalary: true }
    });

    const totalWorkdays = getWeekdaysInMonth(year, month);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const paidHolidayCount = await prisma.holidayCalendar.count({
      where: { deletedAt: null, date: { gte: startOfMonth, lte: endOfMonth } }
    });

    const run = await prisma.$transaction(async (tx) => {
      let payrollRun = existingRun;
      if (payrollRun) {
        await tx.payslip.deleteMany({ where: { payrollRunId: payrollRun.id } });
        payrollRun = await tx.payrollRun.update({
          where: { id: payrollRun.id },
          data: { status: 'Draft', createdBy: 'System Cron' }
        });
      } else {
        payrollRun = await tx.payrollRun.create({
          data: { month, year, status: 'Draft', createdBy: 'System Cron' }
        });
      }

      for (const u of users) {
        const baseSalary = Number(u.monthlySalary || 0);
        if (baseSalary <= 0) continue;

        const monthLogs = await tx.attendanceLog.findMany({
          where: { userId: u.id, clockInTime: { gte: startOfMonth, lte: endOfMonth } },
          select: { clockInTime: true, clockOutTime: true }
        });

        let workedHours = 0;
        for (const log of monthLogs) {
          if (log.clockInTime && log.clockOutTime) {
            const hours = (new Date(log.clockOutTime) - new Date(log.clockInTime)) / (1000 * 60 * 60);
            workedHours += Number.isFinite(hours) ? Math.max(0, hours) : 0;
          }
        }

        const requiredHours = totalWorkdays * REQUIRED_HOURS_PER_DAY;
        const paidHolidayHours = paidHolidayCount * REQUIRED_HOURS_PER_DAY;
        const { gross, pf, esi, tds, lop, net } = calculatePayrollBreakdown({
          baseSalary,
          workedHours,
          requiredHours,
          paidHolidayHours,
        });

        const fileUrl = await generatePayslipHtmlFile({
          runId: payrollRun.id,
          userId: u.id,
          employeeName: u.name,
          employeeEmail: u.email,
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
        });

        await tx.payslip.create({
          data: {
            userId: u.id,
            payrollRunId: payrollRun.id,
            gross,
            pf,
            esi,
            tds,
            lop,
            net,
            fileUrl
          }
        });
      }

      return payrollRun;
    });

    const finalized = await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: 'Finalized', finalizedBy: 'System Cron' }
    });

    const slips = await prisma.payslip.findMany({
      where: { payrollRunId: run.id },
      include: { user: true }
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthStr = monthNames[month - 1];

    for (const slip of slips) {
      await prisma.notification.create({
        data: {
          userId: slip.userId,
          title: 'Payslip Released',
          content: `Your payslip for ${monthStr} ${year} has been generated and shared.`,
          type: 'payroll'
        }
      });

      if (slip.user?.email) {
        await sendEmail({
          to: slip.user.email,
          subject: `Payslip Released - ${monthStr} ${year}`,
          html: `<p>Hi ${slip.user.name},</p><p>Your payslip for <strong>${monthStr} ${year}</strong> is ready.</p><p>Net salary: <strong>${INR(slip.net)}</strong></p><p>You can view/download it from your payroll dashboard.</p>`
        });
      }
    }

    return NextResponse.json({ success: true, runId: finalized.id, payslipsCount: slips.length });
  } catch (error) {
    console.error('Month-end payroll automation error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
