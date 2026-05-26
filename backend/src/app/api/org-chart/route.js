import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Recursive function to build the org tree
async function buildTree(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
      department: { select: { name: true } },
      directReports: { select: { id: true } }
    }
  });
  if (!user) return null;

  const children = await Promise.all(
    user.directReports.map(r => buildTree(r.id))
  );

  return { ...user, children: children.filter(Boolean) };
}

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const role = decoded.role;
    const userId = decoded.id;

    if (role === 'Employee') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // HR Manager and Admin: build from all root nodes (no manager)
    // Manager: build from themselves
    if (role === 'Manager') {
      const tree = await buildTree(userId);
      return NextResponse.json({ tree });
    }

    // HR/IT: find all root nodes
    const roots = await prisma.user.findMany({
      where: { managerId: null, deletedAt: null },
      select: { id: true }
    });

    const trees = await Promise.all(roots.map(r => buildTree(r.id)));
    const tree = {
      id: 'root',
      name: 'Organisation',
      role: '',
      children: trees.filter(Boolean)
    };

    return NextResponse.json({ tree });
  } catch (error) {
    console.error('Org chart error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
