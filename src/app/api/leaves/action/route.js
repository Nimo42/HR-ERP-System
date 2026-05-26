import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';

const prisma = new PrismaClient();

// GET /api/leaves/action?token=xxx&action=approve|reject
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action');

    if (!token || !['approve', 'reject'].includes(action)) {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:4rem;">
          <h2>Invalid link.</h2><p>The approval link is malformed.</p>
        </body></html>
      `, { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { token },
      include: {
        user: { select: { name: true, email: true } },
        leaveType: { select: { name: true, isEmergency: true } }
      }
    });

    if (!leaveRequest) {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:4rem;color:#dc2626;">
          <h2>Link not found.</h2><p>This approval link does not exist.</p>
        </body></html>
      `, { status: 404, headers: { 'Content-Type': 'text/html' } });
    }

    if (leaveRequest.tokenExpiry < new Date()) {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:4rem;color:#dc2626;">
          <h2>Link expired.</h2><p>Please log in to the HR portal to take action.</p>
          <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="color:#7B5EA7;">Go to portal →</a>
        </body></html>
      `, { status: 410, headers: { 'Content-Type': 'text/html' } });
    }

    if (leaveRequest.status !== 'Pending') {
      return new Response(`
        <html><body style="font-family:sans-serif;text-align:center;padding:4rem;">
          <h2>Already ${leaveRequest.status}.</h2>
          <p>This leave request was already processed.</p>
        </body></html>
      `, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }

    const status = action === 'approve' ? 'Approved' : 'Rejected';
    await prisma.leaveRequest.update({ where: { token }, data: { status } });

    // Deduct balance on approval
    if (status === 'Approved' && !leaveRequest.leaveType.isEmergency) {
      const days = Math.ceil((new Date(leaveRequest.endDate) - new Date(leaveRequest.startDate)) / (1000 * 60 * 60 * 24)) + 1;
      const year = new Date(leaveRequest.startDate).getFullYear();
      await prisma.leaveBalance.updateMany({
        where: { userId: leaveRequest.userId, leaveTypeId: leaveRequest.leaveTypeId, year },
        data: { balance: { decrement: days } }
      });
    }

    // Notify employee
    const { sendEmail } = await import('@/lib/email');
    const statusColor = status === 'Approved' ? '#10b981' : '#dc2626';
    await sendEmail({
      to: leaveRequest.user.email,
      subject: `Your leave request has been ${status}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
          <h2 style="color:${statusColor};">Leave Request ${status}</h2>
          <p>Hi ${leaveRequest.user.name}, your <strong>${leaveRequest.leaveType.name}</strong> leave has been <strong style="color:${statusColor};">${status}</strong>.</p>
        </div>
      `
    });

    const icon = status === 'Approved' ? '✅' : '❌';
    return new Response(`
      <html>
        <head><title>Leave ${status}</title></head>
        <body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#F2EDE6;">
          <div style="background:#fff;border-radius:16px;padding:3rem;text-align:center;max-width:420px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="font-size:3rem;margin-bottom:1rem;">${icon}</div>
            <h2 style="color:#1a1a1a;margin-bottom:0.5rem;">Leave ${status}</h2>
            <p style="color:#6b7280;margin-bottom:1.5rem;">
              ${leaveRequest.user.name}'s ${leaveRequest.leaveType.name} leave request has been ${status.toLowerCase()}.
            </p>
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}" style="display:inline-block;padding:10px 24px;background:#1a1a1a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
              Go to Portal →
            </a>
          </div>
        </body>
      </html>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });

  } catch (error) {
    console.error('Leave action error:', error);
    return new Response('<html><body>Something went wrong.</body></html>', { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
