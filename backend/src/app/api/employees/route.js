import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

    if (userRole === 'Employee') {
      // Employee sees only themselves
      whereClause.id = userId;
    } 

    const employees = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        monthlySalary: true,
        department: { select: { id: true, name: true } },
        joinDate: true,
        employeeId: true,
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

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const callerRole = decoded.role;
    const callerId = decoded.id;

    const { name, email, role, departmentId, monthlySalary } = await request.json();

    if (!name || !email || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // Role gate checks
    if (callerRole === 'Admin') {
      if (role !== 'HR Manager') {
        return NextResponse.json({ message: 'Admin can only create HR Managers' }, { status: 403 });
      }
    } else if (callerRole === 'HR Manager') {
      if (role !== 'Employee') {
        return NextResponse.json({ message: 'HR Manager can only create Employees' }, { status: 403 });
      }
      if (monthlySalary === undefined || monthlySalary === null || Number(monthlySalary) <= 0) {
        return NextResponse.json({ message: 'Monthly salary is required and must be greater than 0' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ message: 'Employees cannot create accounts' }, { status: 403 });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'Email already registered' }, { status: 400 });
    }

    // Default temporary password hash (must be changed on first login)
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    // Generate unique employeeId
    function generateRandomDigits(length) {
      let result = '';
      for (let i = 0; i < length; i++) {
        result += Math.floor(Math.random() * 10).toString();
      }
      return result;
    }

    let newEmployeeId = '';
    let exists = true;
    while (exists) {
      if (role === 'HR Manager') {
        newEmployeeId = 'HR' + generateRandomDigits(4);
      } else if (role === 'Admin') {
        newEmployeeId = 'AD' + generateRandomDigits(4);
      } else {
        newEmployeeId = 'E' + generateRandomDigits(5);
      }
      const u = await prisma.user.findUnique({ where: { employeeId: newEmployeeId } });
      if (!u) {
        exists = false;
      }
    }

    let resolvedDepartmentId = departmentId || null;

    // Create the user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        role,
        password: defaultPasswordHash,
        departmentId: resolvedDepartmentId,
        employeeId: newEmployeeId,
        monthlySalary: monthlySalary !== undefined && monthlySalary !== null ? Number(monthlySalary) : null,
        faceEnrolled: false,
        faceEmbedding: null,
        faceEnrolledAt: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }
    });

    // Auto-create initial leave balances for Employees
    if (role === 'Employee') {
      const leaveTypes = await prisma.leaveType.findMany();
      const currentYear = new Date().getFullYear();
      for (const lt of leaveTypes) {
        await prisma.leaveBalance.create({
          data: {
            userId: newUser.id,
            leaveTypeId: lt.id,
            balance: lt.quota,
            year: currentYear
          }
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: newUser.id,
        type: 'system',
        title: 'Welcome to Antbox',
        content: 'Your account is ready. Use your initial password to sign in.',
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Account created successfully', 
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    });

  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ message: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
