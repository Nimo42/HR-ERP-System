import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET â€” payroll gate: pending draft + history
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const runs = await prisma.payrollRun.findMany({
      include: {
        payslips: {
          include: {
            user: { select: { name: true, email: true, role: true, department: { select: { name: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];

    const pending = runs.find(r => r.status === 'Draft') || null;
    const history = runs.filter(r => r.status === 'Finalized');

    const formatRun = (run) => {
      const totalGross = run.payslips.reduce((s, p) => s + p.gross, 0);
      const totalPf = run.payslips.reduce((s, p) => s + p.pf, 0);
      const totalEsi = run.payslips.reduce((s, p) => s + p.esi, 0);
      const totalTds = run.payslips.reduce((s, p) => s + p.tds, 0);
      const totalLop = run.payslips.reduce((s, p) => s + p.lop, 0);
      const totalNet = run.payslips.reduce((s, p) => s + p.net, 0);
      return {
        id: run.id,
        month: run.month,
        year: run.year,
        monthLabel: monthNames[run.month - 1],
        status: run.status,
        createdBy: run.createdBy,
        finalizedBy: run.finalizedBy,
        createdAt: run.createdAt,
        updatedAt: run.updatedAt,
        employeeCount: run.payslips.length,
        totalGross,
        totalPf,
        totalEsi,
        totalTds,
        totalLop,
        totalNet,
        payslips: run.payslips.map(p => ({
          id: p.id,
          name: p.user.name,
          email: p.user.email,
          role: p.user.role,
          department: p.user.department?.name || 'â€”',
          gross: p.gross,
          pf: p.pf,
          esi: p.esi,
          tds: p.tds,
          lop: p.lop,
          net: p.net
        }))
      };
    };

    return NextResponse.json({
      pending: pending ? formatRun(pending) : null,
      history: history.map(r => formatRun(r))
    });
  } catch (error) {
    console.error('Payroll gate GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH â€” finalize or reject a payroll run
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { id, action, reason } = await request.json();
    if (!id || !action) return NextResponse.json({ message: 'id and action required' }, { status: 400 });

    const run = await prisma.payrollRun.findUnique({
      where: { id },
      include: { payslips: { include: { user: true } } }
    });

    if (!run) return NextResponse.json({ message: 'Payroll run not found' }, { status: 404 });
    if (run.status === 'Finalized') return NextResponse.json({ message: 'Already finalized' }, { status: 400 });

    if (action === 'reject') {
      await prisma.payrollRun.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Draft rejected and removed' });
    }

    if (action === 'finalize') {
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const monthStr = monthNames[run.month - 1];

      await prisma.$transaction(async (tx) => {
        await tx.payrollRun.update({
          where: { id },
          data: { status: 'Finalized', finalizedBy: decoded.name }
        });

        try {
          const { sendEmail } = await import('../../../../lib/email.js');
          for (const slip of run.payslips) {
            await tx.notification.create({
              data: {
                userId: slip.userId,
                title: 'Payslip Released',
                content: `Your payslip for ${monthStr} ${run.year} has been processed. Net: â‚¹${Math.round(slip.net).toLocaleString('en-IN')}`,
                type: 'payroll'
              }
            });
            if (slip.user?.email) {
              await sendEmail({
                to: slip.user.email,
                subject: `Your Payslip for ${monthStr} ${run.year} is Ready`,
                html: `<p>Hi ${slip.user.name}, your payslip for ${monthStr} ${run.year} has been finalized. Net pay: â‚¹${Math.round(slip.net).toLocaleString('en-IN')}.</p>`
              });
            }
          }
        } catch (emailErr) {
          console.error('Payslip email error (non-fatal):', emailErr.message);
        }
      });

      return NextResponse.json({ success: true, message: 'Payroll finalized and payslips dispatched' });
    }

    return NextResponse.json({ message: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Payroll gate PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
