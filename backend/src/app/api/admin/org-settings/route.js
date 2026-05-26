import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

function authGuard(decoded) {
  return decoded && decoded.role === 'Admin';
}

function getYearRange(yearInput) {
  const parsedYear = Number.parseInt(yearInput, 10);
  const year = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();
  const start = new Date(year, 0, 1, 0, 0, 0, 0);
  const end = new Date(year, 11, 31, 23, 59, 59, 999);
  return { year, start, end };
}

// GET â€” all org settings, departments, locations, holiday calendar, working hours
export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!authGuard(decoded)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const { year, start, end } = getYearRange(searchParams.get('year'));
    const [settings, departments, locations, holidays] = await Promise.all([
      prisma.orgSetting.findMany(),
      prisma.department.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { users: true } } },
        orderBy: { name: 'asc' }
      }),
      prisma.location.findMany({
        where: { deletedAt: null },
        orderBy: { name: 'asc' }
      }),
      prisma.holidayCalendar.findMany({
        where: {
          deletedAt: null,
          date: { gte: start, lte: end }
        },
        orderBy: { date: 'asc' }
      })
    ]);

    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    return NextResponse.json({
      profile: {
        companyName: settingsMap['companyName'] || '',
        displayName: settingsMap['displayName'] || '',
        address: settingsMap['address'] || '',
        primaryEmail: settingsMap['primaryEmail'] || '',
        timezone: settingsMap['timezone'] || 'Asia/Kolkata',
        logoUrl: settingsMap['logoUrl'] || ''
      },
      workingHours: {
        shiftStart: settingsMap['shiftStart'] || '09:00',
        shiftEnd: settingsMap['shiftEnd'] || '18:00',
        minHoursPresent: settingsMap['minHoursPresent'] || '4',
        overtimeThreshold: settingsMap['overtimeThreshold'] || '9'
      },
      integrations: {
        resend: settingsMap['integration_resend'] || 'unconfigured',
        twilio: settingsMap['integration_twilio'] || 'unconfigured',
        googleCalendar: settingsMap['integration_googleCalendar'] || 'unconfigured',
        s3: settingsMap['integration_s3'] || 'unconfigured'
      },
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        employeeCount: d._count.users
      })),
      locations: locations.map(l => ({
        id: l.id,
        name: l.name,
        address: l.address || '',
        ipRange: l.ipRange || ''
      })),
      holidays: holidays.map(h => ({
        id: h.id,
        name: h.name,
        date: h.date
      })),
      holidayYear: year
    });
  } catch (error) {
    console.error('Admin settings GET error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// POST â€” update org settings
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    const decoded = jwt.decode(token);
    if (!authGuard(decoded)) return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { section, data } = body;

    if (section === 'profile') {
      const fields = ['companyName', 'displayName', 'address', 'primaryEmail', 'timezone'];
      for (const key of fields) {
        if (data[key] !== undefined) {
          await prisma.orgSetting.upsert({
            where: { key },
            update: { value: data[key] },
            create: { key, value: data[key] }
          });
        }
      }
    }

    if (section === 'workingHours') {
      const fields = ['shiftStart', 'shiftEnd', 'minHoursPresent', 'overtimeThreshold'];
      for (const key of fields) {
        if (data[key] !== undefined) {
          await prisma.orgSetting.upsert({
            where: { key },
            update: { value: data[key] },
            create: { key, value: data[key] }
          });
        }
      }
    }

    if (section === 'department') {
      if (data.action === 'create') {
        await prisma.department.create({ data: { name: data.name } });
      } else if (data.action === 'archive' && data.id) {
        await prisma.department.update({ where: { id: data.id }, data: { deletedAt: new Date() } });
      } else if (data.action === 'edit' && data.id) {
        await prisma.department.update({ where: { id: data.id }, data: { name: data.name } });
      }
    }

    if (section === 'location') {
      if (data.action === 'create') {
        await prisma.location.create({ data: { name: data.name, address: data.address, ipRange: data.ipRange } });
      } else if (data.action === 'delete' && data.id) {
        await prisma.location.update({ where: { id: data.id }, data: { deletedAt: new Date() } });
      }
    }

    if (section === 'holiday') {
      const { year, start, end } = getYearRange(data?.year);

      if (data.action === 'toggle') {
        const dateText = String(data.date || '').trim();
        const name = String(data.name || 'Holiday').trim() || 'Holiday';
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
        if (!m) {
          return NextResponse.json({ message: 'Date must be in YYYY-MM-DD format' }, { status: 400 });
        }

        const parsed = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ message: 'Invalid holiday date' }, { status: 400 });
        }
        if (parsed < start || parsed > end) {
          return NextResponse.json({ message: `Holiday date must be within ${year}` }, { status: 400 });
        }
        const dayStart = new Date(parsed);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(parsed);
        dayEnd.setHours(23, 59, 59, 999);

        const existing = await prisma.holidayCalendar.findFirst({
          where: {
            deletedAt: null,
            date: { gte: dayStart, lte: dayEnd }
          }
        });

        if (existing) {
          await prisma.holidayCalendar.update({
            where: { id: existing.id },
            data: { deletedAt: new Date() }
          });
          return NextResponse.json({ success: true, toggled: 'removed' });
        }

        await prisma.holidayCalendar.create({ data: { name, date: parsed } });
        return NextResponse.json({ success: true, toggled: 'added' });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin settings POST error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
