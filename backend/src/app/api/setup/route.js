import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// GET organization configuration
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || !['Admin', 'HR Manager'].includes(decoded.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const settings = await prisma.orgSetting.findMany();
    const departments = await prisma.department.findMany({ select: { id: true, name: true, _count: { select: { users: true } } } });
    const locations = await prisma.location.findMany();
    const admins = await prisma.user.findMany({
      where: { role: { in: ['Admin', 'HR Manager'] } },
      select: { id: true, name: true, email: true, role: true }
    });

    const companyName = settings.find(s => s.key === 'companyName')?.value || '';
    const industry = settings.find(s => s.key === 'industry')?.value || '';
    const setupComplete = settings.find(s => s.key === 'setupComplete')?.value === 'true';

    return NextResponse.json({
      companyName,
      industry,
      setupComplete,
      departments,
      locations,
      admins
    });
  } catch (error) {
    console.error('Setup GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const decoded = jwt.decode(token);
    if (!decoded || decoded.role !== 'Admin') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const { companyName, industry, departmentName, locationName, hrEmail, hrName } = await request.json();

    // 1. Save Org Settings
    await prisma.orgSetting.upsert({
      where: { key: 'companyName' },
      update: { value: companyName },
      create: { key: 'companyName', value: companyName }
    });
    
    await prisma.orgSetting.upsert({
      where: { key: 'industry' },
      update: { value: industry },
      create: { key: 'industry', value: industry }
    });

    // 2. Save Initial Department
    let department = null;
    if (departmentName) {
      department = await prisma.department.create({
        data: { name: departmentName }
      });
    }

    // 3. Save Initial Location
    if (locationName) {
      await prisma.location.create({
        data: { name: locationName }
      });
    }

    // 4. Create HR Manager
    if (hrEmail && hrName) {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      
      const hrUser = await prisma.user.upsert({
        where: { email: hrEmail },
        update: { name: hrName, role: 'HR Manager', departmentId: department?.id, password: hashedPassword, resetPasswordToken: null, resetPasswordExpires: null },
        create: {
          email: hrEmail,
          name: hrName,
          password: hashedPassword,
          role: 'HR Manager',
          departmentId: department?.id,
          resetPasswordToken: null,
          resetPasswordExpires: null
        }
      });

      await prisma.notification.create({
        data: {
          userId: hrUser.id,
          type: 'system',
          title: `Welcome to ${companyName}`,
          content: `Your HR Manager account is ready. Use Password@123 to sign in.`,
        }
      });
    }

    // Record setup completion
    await prisma.orgSetting.upsert({
      where: { key: 'setupComplete' },
      update: { value: 'true' },
      create: { key: 'setupComplete', value: 'true' }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
