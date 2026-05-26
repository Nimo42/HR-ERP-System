import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!decoded) return NextResponse.json({ message: 'Invalid token' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = formData.get('employeeId');
    const type = formData.get('type') || 'Other';

    if (!file || !employeeId) {
      return NextResponse.json({ message: 'File and employeeId required' }, { status: 400 });
    }

    // Access check: HR/IT can upload for anyone; employee can only upload for themselves
    const requesterRole = decoded.role;
    if (requesterRole === 'Employee' && decoded.id !== employeeId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Store in /public/uploads/<employeeId>/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', employeeId);
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split('.').pop();
    const filename = `${type.replace(/\s/g, '_')}_${Date.now()}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    await writeFile(filepath, buffer);

    const fileUrl = `/uploads/${employeeId}/${filename}`;

    const doc = await prisma.document.create({
      data: { userId: employeeId, type, fileUrl }
    });

    return NextResponse.json({ success: true, document: doc });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 });
  }
}
