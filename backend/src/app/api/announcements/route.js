import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    // Scoped announcements (department specific or company wide)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { departmentId: true }
    });

    const announcements = await prisma.announcement.findMany({
      where: {
        OR: [
          { targetDepartmentId: null },
          { targetDepartmentId: user?.departmentId || 'none' }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ announcements });
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

    const { title, content, targetDepartmentId } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ message: 'Title and content are required' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        targetDepartmentId: targetDepartmentId || null
      }
    });

    // Notify users
    const users = await prisma.user.findMany({
      where: targetDepartmentId ? { departmentId: targetDepartmentId } : {}
    });

    for (const u of users) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: 'New Announcement Bulletin',
          content: title,
          type: 'general'
        }
      });
    }

    return NextResponse.json({ success: true, announcement }, { status: 201 });
  } catch (error) {
    console.error('Announcement POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
