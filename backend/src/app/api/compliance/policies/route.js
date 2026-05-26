import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET policies
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const policies = await prisma.policy.findMany({
      include: {
        acknowledgements: {
          where: { userId: decoded.id }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = policies.map(p => ({
      id: p.id,
      title: p.title,
      fileUrl: p.fileUrl,
      readReceiptRequired: p.readReceiptRequired,
      createdAt: p.createdAt,
      acknowledged: p.acknowledgements.length > 0
    }));

    return NextResponse.json({ policies: formatted });
  } catch (error) {
    console.error('Policies GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST policy (HR only)
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || !['HR Manager', 'Admin'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { title, fileUrl, readReceiptRequired } = await request.json();

    if (!title || !fileUrl) {
      return NextResponse.json({ message: 'Title and document path are required' }, { status: 400 });
    }

    const policy = await prisma.policy.create({
      data: {
        title,
        fileUrl,
        readReceiptRequired: !!readReceiptRequired
      }
    });

    // Notify employees
    const users = await prisma.user.findMany({ select: { id: true } });
    if (readReceiptRequired) {
      for (const u of users) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: 'New Policy Acknowledgement Needed',
            content: `Please read and acknowledge: "${title}"`,
            type: 'compliance'
          }
        });
      }
    }

    return NextResponse.json({ success: true, policy }, { status: 201 });
  } catch (error) {
    console.error('Policy POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
