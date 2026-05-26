import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// POST log policy read acknowledgement
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const { policyId } = await request.json();
    if (!policyId) return NextResponse.json({ message: 'Policy ID is required' }, { status: 400 });

    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) return NextResponse.json({ message: 'Policy not found' }, { status: 404 });

    const ack = await prisma.policyAcknowledgement.upsert({
      where: {
        policyId_userId: {
          policyId,
          userId: decoded.id
        }
      },
      update: {}, // Keep existing log
      create: {
        policyId,
        userId: decoded.id
      }
    });

    return NextResponse.json({ success: true, acknowledgement: ack });
  } catch (error) {
    console.error('Acknowledgement POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
