import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

const WARNING_TEMPLATES = {
  Verbal: `This is a record of a verbal warning issued due to performance or attendance issues. Continued failure to meet expectations will lead to written warning levels.`,
  Written: `We are issuing this formal written warning regarding your recent compliance/performance issues. You are required to correct these immediately. Failure to do so will result in further disciplinary action, up to termination.`,
  ShowCause: `You are hereby issued this Show-Cause notice. You are required to submit a written explanation within 48 hours as to why disciplinary action should not be initiated against you.`
};

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const isHR = ['HR Manager', 'Admin'].includes(decoded.role);
    let where = {};
    if (!isHR) {
      where.userId = decoded.id;
    }

    const warnings = await prisma.warningLetter.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { sentAt: 'desc' }
    });

    return NextResponse.json({ warnings });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || !['HR Manager', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { employeeId, type, customDetails } = await request.json();

    if (!employeeId || !['Verbal', 'Written', 'ShowCause'].includes(type)) {
      return NextResponse.json({ message: 'Valid Employee ID and warning Type are required' }, { status: 400 });
    }

    const employee = await prisma.user.findUnique({ where: { id: employeeId } });
    if (!employee) return NextResponse.json({ message: 'Employee not found' }, { status: 404 });

    const templateBase = WARNING_TEMPLATES[type];
    const content = `${templateBase}\n\nNotes from HR Manager: ${customDetails || 'None provided.'}`;

    const warning = await prisma.warningLetter.create({
      data: {
        userId: employeeId,
        type,
        content
      }
    });

    // Notify employee
    await prisma.notification.create({
      data: {
        userId: employeeId,
        title: `Compliance Notice: ${type} Warning`,
        content: `You have received a formal ${type} warning. Details sent to your email.`,
        type: 'compliance'
      }
    });

    // Send email using helper
    const { sendEmail } = await import('../../../../lib/email');
    if (employee.email) {
      const typeLabel = type === 'ShowCause' ? 'Show-Cause Notice' : `${type} Warning Letter`;
      const badgeColor = type === 'ShowCause' ? '#dc2626' : type === 'Written' ? '#ea580c' : '#d97706';

      await sendEmail({
        to: employee.email,
        subject: `CONFIDENTIAL: Compliance Notice - ${typeLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;border:1px solid #f0ece6;border-radius:12px;padding:2rem;">
            <div style="display:inline-block;padding:0.25rem 0.75rem;background:${badgeColor};color:#fff;font-weight:700;font-size:0.75rem;border-radius:999px;text-transform:uppercase;margin-bottom:1rem;">
              Strictly Confidential
            </div>
            <h2 style="color:#111827;margin-top:0;">${typeLabel}</h2>
            <p>Dear ${employee.name},</p>
            <p>Please review this formal notice issued regarding compliance expectations.</p>
            <div style="background:#fafaf9;border-left:4px solid ${badgeColor};padding:1rem;margin:1.5rem 0;font-size:0.875rem;color:#374151;white-space:pre-line;">
              ${content}
            </div>
            <p style="font-size:0.8125rem;color:#9ca3af;margin-top:2rem;">This is an official warning record maintained in the Antbox HR Directory. For disputes, contact Human Resources.</p>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, warning });
  } catch (error) {
    console.error('Warning POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
