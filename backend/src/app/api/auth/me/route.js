import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, employeeId: true, name: true, email: true, role: true, faceEnrolled: true }
    });

    if (!user) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const pendingInvitation = await prisma.notification.findFirst({
      where: { userId: user.id, type: 'invitation', read: false },
      select: { id: true }
    });

    return NextResponse.json({ user: { ...user, pendingInvitation: Boolean(pendingInvitation) } });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

