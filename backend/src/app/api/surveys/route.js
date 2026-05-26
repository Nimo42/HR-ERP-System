import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// GET surveys & aggregates
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const isHR = ['HR Manager', 'Admin'].includes(decoded.role);

    if (isHR) {
      // HR sees all surveys with anonymous responses aggregated
      const surveys = await prisma.pulseSurvey.findMany({
        include: {
          responses: true
        },
        orderBy: { createdAt: 'desc' }
      });

      const formatted = surveys.map(s => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        s.responses.forEach(r => {
          if (counts[r.rating] !== undefined) counts[r.rating]++;
        });
        return {
          id: s.id,
          question: s.question,
          active: s.active,
          createdAt: s.createdAt,
          totalResponses: s.responses.length,
          aggregates: counts
        };
      });

      return NextResponse.json({ surveys: formatted });
    } else {
      // Employees see active survey only if they haven't responded yet
      const activeSurvey = await prisma.pulseSurvey.findFirst({
        where: { active: true }
      });

      if (!activeSurvey) {
        return NextResponse.json({ survey: null });
      }

      // Check if employee voted already
      const voted = await prisma.surveyResponse.findUnique({
        where: {
          pulseSurveyId_userId: {
            pulseSurveyId: activeSurvey.id,
            userId: decoded.id
          }
        }
      });

      return NextResponse.json({
        survey: voted ? null : activeSurvey
      });
    }
  } catch (error) {
    console.error('Surveys GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST submit anonymous vote
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { surveyId, rating } = await request.json();

    if (!surveyId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Survey ID and a rating between 1 and 5 required' }, { status: 400 });
    }

    const survey = await prisma.pulseSurvey.findUnique({ where: { id: surveyId } });
    if (!survey || !survey.active) {
      return NextResponse.json({ message: 'Active survey not found' }, { status: 404 });
    }

    // Unique index automatically handles duplicate checks, wrapped in try/catch or upsert
    await prisma.surveyResponse.create({
      data: {
        pulseSurveyId: surveyId,
        userId: decoded.id,
        rating: parseInt(rating)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'You have already voted in this pulse survey.' }, { status: 400 });
    }
    console.error('Submit vote error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
