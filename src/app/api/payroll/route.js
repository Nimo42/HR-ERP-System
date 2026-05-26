import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper for salary mappings
const BASE_SALARY_MAP = {
  'IT Owner': 150000,
  'HR Manager': 120000,
  'Manager': 80000,
  'Employee': 50000,
};

// GET payroll runs or payslips
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const isHR = ['HR Manager', 'IT Owner'].includes(decoded.role);

    if (isHR) {
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
          payrollRun: { status: 'Finalized' }
        },
        include: {
          payrollRun: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ payslips });
    }
  } catch (error) {
    console.error('Payroll GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST — HR runs draft payroll calculation
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'HR Manager') {
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

    // 2. Query all active users
    const users = await prisma.user.findMany({
      where: { deletedAt: null }
    });

    const totalWorkdays = 22; // Standard weekdays in a month estimate
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

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
        const baseSalary = BASE_SALARY_MAP[u.role] || 50000;

        // Deductions formulas
        const pf = baseSalary * 0.12; // 12%
        const esi = baseSalary * 0.0075; // 0.75%
        const tds = baseSalary * 0.10; // 10%

        // Calculate LOP (Absences)
        // Count days user punched in
        const presentDaysCount = await tx.attendanceLog.count({
          where: {
            userId: u.id,
            clockInTime: { gte: startOfMonth, lte: endOfMonth }
          }
        });

        // Count approved leaves in this month
        const leaves = await tx.leaveRequest.findMany({
          where: {
            userId: u.id,
            status: 'Approved',
            startDate: { lte: endOfMonth },
            endDate: { gte: startOfMonth }
          }
        });

        let approvedLeaveDays = 0;
        leaves.forEach(l => {
          const start = new Date(Math.max(l.startDate, startOfMonth));
          const end = new Date(Math.min(l.endDate, endOfMonth));
          const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
          approvedLeaveDays += diff;
        });

        const absences = Math.max(0, totalWorkdays - presentDaysCount - approvedLeaveDays);
        const lop = absences > 0 ? (baseSalary / totalWorkdays) * absences : 0;

        const net = Math.max(0, baseSalary - pf - esi - tds - lop);

        const payslip = await tx.payslip.create({
          data: {
            userId: u.id,
            payrollRunId: run.id,
            gross: baseSalary,
            pf,
            esi,
            tds,
            lop,
            net,
            fileUrl: `/payslips/${run.id}/${u.id}.html` // Simulated payslip local download url
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

// PATCH — IT Owner finalizes the payroll run
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'IT Owner') {
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
      const { sendEmail } = await import('@/lib/email');

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
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">Gross Salary</td><td style="font-weight:600;text-align:right;">₹${slip.gross.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">PF Deduction</td><td style="color:#dc2626;text-align:right;">- ₹${slip.pf.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">TDS</td><td style="color:#dc2626;text-align:right;">- ₹${slip.tds.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:1px solid #fafaf9;padding:8px;"><td style="color:#6b7280;padding:8px 0;">LOP (Absences)</td><td style="color:#dc2626;text-align:right;">- ₹${slip.lop.toLocaleString('en-IN')}</td></tr>
                  <tr style="border-bottom:2px solid #7B5EA7;padding:8px;font-weight:700;"><td style="padding:8px 0;font-size:1rem;color:#111827;">Net Salary Disbursed</td><td style="font-size:1rem;color:#10b981;text-align:right;">₹${slip.net.toLocaleString('en-IN')}</td></tr>
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
