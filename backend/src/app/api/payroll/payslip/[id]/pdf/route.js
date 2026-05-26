import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

function INR(value) {
  return `Rs ${Math.round(Number(value || 0)).toLocaleString('en-IN')}`;
}

function toPdfBuffer({ slip, userName, userEmail, employeeId, month, year, status }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).text('Antbox Payslip');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#555').text(`Period: ${month}/${year}`);
    doc.text(`Status: ${status}`);
    doc.fillColor('#000');
    doc.moveDown();

    doc.fontSize(12).text(`Employee: ${userName || '-'}`);
    doc.text(`Employee ID: ${employeeId || '-'}`);
    doc.text(`Email: ${userEmail || '-'}`);
    doc.moveDown();

    const rows = [
      ['Gross Salary', INR(slip.gross)],
      ['PF', `- ${INR(slip.pf)}`],
      ['ESI', `- ${INR(slip.esi)}`],
      ['TDS', `- ${INR(slip.tds)}`],
      ['LOP', `- ${INR(slip.lop)}`],
      ['Net Pay', INR(slip.net)],
    ];

    for (const [label, value] of rows) {
      doc.fontSize(12).text(label, 50, doc.y, { continued: true });
      doc.text(value, { align: 'right' });
      doc.moveDown(0.2);
    }

    doc.moveDown();
    doc.fontSize(10).fillColor('#666').text(`Generated on ${new Date().toLocaleString('en-IN')}`);
    doc.end();
  });
}

export async function GET(request, { params }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { id } = await params;
    const slip = await prisma.payslip.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, employeeId: true } },
        payrollRun: { select: { month: true, year: true, status: true } },
      },
    });

    if (!slip) return NextResponse.json({ message: 'Payslip not found' }, { status: 404 });

    const isPrivileged = ['Admin', 'HR Manager', 'IT Owner'].includes(decoded.role);
    const isOwner = decoded.id === slip.userId;
    const isFinalized = slip.payrollRun?.status === 'Finalized';

    if (!isPrivileged && !(isOwner && isFinalized)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const pdf = await toPdfBuffer({
      slip,
      userName: slip.user?.name,
      userEmail: slip.user?.email,
      employeeId: slip.user?.employeeId,
      month: slip.payrollRun?.month,
      year: slip.payrollRun?.year,
      status: slip.payrollRun?.status || 'Draft',
    });

    const filename = `payslip-${slip.user?.employeeId || slip.userId}-${slip.payrollRun?.month}-${slip.payrollRun?.year}.pdf`;
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=\"${filename}\"`,
      },
    });
  } catch (error) {
    console.error('Payslip PDF download error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
