import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || !['HR Manager', 'IT Owner'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { question } = await request.json();
    if (!question) return NextResponse.json({ message: 'Question text is required' }, { status: 400 });

    // Mark previous surveys as inactive
    await prisma.pulseSurvey.updateMany({
      where: { active: true },
      data: { active: false }
    });

    const survey = await prisma.pulseSurvey.create({
      data: {
        question,
        active: true
      }
    });

    // Notify employees
    const users = await prisma.user.findMany({ select: { id: true } });
    for (const u of users) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: 'New Pulse Survey Live',
          content: 'HR has published a quick anonymous feedback survey.',
          type: 'general'
        }
      });
    }

    return NextResponse.json({ success: true, survey }, { status: 201 });
  } catch (error) {
    console.error('Create survey error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
