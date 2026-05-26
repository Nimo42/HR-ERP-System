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
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { embeddings } = await request.json();
    if (!embeddings || !Array.isArray(embeddings) || embeddings.length !== 3) {
      return NextResponse.json({ message: 'Invalid enrollment data. Exactly 3 captures required.' }, { status: 400 });
    }

    // Verify all 3 embeddings are arrays of 128 floats
    for (const emb of embeddings) {
      if (!Array.isArray(emb) || emb.length !== 128) {
        return NextResponse.json({ message: 'Invalid face embeddings. Embeddings must have 128 dimensions.' }, { status: 400 });
      }
    }

    // Calculate averaged embedding
    const averagedEmbedding = [];
    for (let i = 0; i < 128; i++) {
      const sum = embeddings[0][i] + embeddings[1][i] + embeddings[2][i];
      averagedEmbedding.push(sum / 3);
    }

    // Save in user record
    await prisma.user.update({
      where: { id: decoded.id },
      data: {
        faceEmbedding: JSON.stringify(averagedEmbedding),
        faceEnrolled: true,
        faceEnrolledAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Face enrolled successfully!'
    });

  } catch (error) {
    console.error('Face enrollment error:', error);
    return NextResponse.json({ message: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
