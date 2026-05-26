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

    const userRole = decoded.role;
    const userId = decoded.id;

    // Scoped query logic
    let whereClause = { deletedAt: null };

    if (userRole === 'Manager') {
      // Manager sees only their direct reports
      whereClause.managerId = userId;
    } else if (userRole === 'Employee') {
      // Employee sees only themselves
      whereClause.id = userId;
    } 
    // IT Owner and HR Manager see everyone (whereClause unchanged)

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: { select: { name: true } },
        manager: { select: { name: true } },
        joinDate: true,
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ employees });

  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
