import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET user notifications
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const expiryCutoff = new Date(Date.now() - 30 * 1000);
    await prisma.notification.deleteMany({
      where: {
        userId: decoded.id,
        read: true,
        readAt: { lte: expiryCutoff }
      }
    });

    const notifications = await prisma.notification.findMany({
      where: { userId: decoded.id },
      orderBy: { createdAt: 'desc' },
      take: 20 // Limit to latest 20 notifications
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// PATCH mark read
export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const { id, markAll, action } = body;

    if (markAll) {
      await prisma.notification.updateMany({
        where: { userId: decoded.id, type: { not: 'invitation' } },
        data: { read: true, readAt: new Date() }
      });
    } else if (id && action && (action === 'accept' || action === 'decline')) {
      const notification = await prisma.notification.findFirst({
        where: { id, userId: decoded.id }
      });
      if (!notification) {
        return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
      }
      if (notification.type !== 'invitation') {
        return NextResponse.json({ message: 'Action not supported for this notification' }, { status: 400 });
      }

      const userUpdate = action === 'accept'
        ? { resetPasswordToken: null, resetPasswordExpires: null }
        : { deletedAt: new Date() };

      await prisma.$transaction([
        prisma.user.update({
          where: { id: decoded.id },
          data: userUpdate
        }),
        prisma.notification.updateMany({
          where: { id, userId: decoded.id },
          data: { read: true, readAt: new Date() }
        })
      ]);
    } else if (id) {
      const notification = await prisma.notification.findFirst({
        where: { id, userId: decoded.id },
        select: { type: true }
      });
      if (!notification) {
        return NextResponse.json({ message: 'Notification not found' }, { status: 404 });
      }
      if (notification.type === 'invitation') {
        return NextResponse.json({ message: 'Use accept or decline for invitation notifications' }, { status: 400 });
      }
      await prisma.notification.updateMany({
        where: { id, userId: decoded.id },
        data: { read: true, readAt: new Date() }
      });
    } else {
      return NextResponse.json({ message: 'Missing notification ID or markAll option' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
