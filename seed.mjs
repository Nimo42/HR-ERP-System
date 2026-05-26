import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Clearing existing database tables...');
  await prisma.surveyResponse.deleteMany({});
  await prisma.warningLetter.deleteMany({});
  await prisma.policyAcknowledgement.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.payrollRun.deleteMany({});
  await prisma.policy.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.pulseSurvey.deleteMany({});
  await prisma.attendanceCorrection.deleteMany({});
  await prisma.attendanceLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.leaveRequest.deleteMany({});
  await prisma.leaveBalance.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.bankDetail.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.leaveType.deleteMany({});
  await prisma.orgSetting.deleteMany({});

  console.log('Seeding departments...');
  const engineering = await prisma.department.create({
    data: { id: 'dept-eng', name: 'Engineering' }
  });
  
  const hrDept = await prisma.department.create({
    data: { id: 'dept-hr', name: 'Human Resources' }
  });

  const management = await prisma.department.create({
    data: { id: 'dept-mgmt', name: 'Management' }
  });

  console.log('Seeding locations...');
  await prisma.location.create({
    data: { id: 'loc-mumbai', name: 'Mumbai HQ', ipRange: '127.0.0.1, ::1, localhost' }
  });

  console.log('Seeding leave types...');
  const typesData = [
    { id: 'lt-casual', name: 'Casual Leave', quota: 12, carryForward: true, advanceNotice: 2, isEmergency: false },
    { id: 'lt-sick', name: 'Sick Leave', quota: 10, carryForward: false, advanceNotice: 0, isEmergency: false },
    { id: 'lt-earned', name: 'Earned Leave', quota: 15, carryForward: true, advanceNotice: 7, isEmergency: false },
    { id: 'lt-emergency', name: 'Emergency Leave', quota: 0, carryForward: false, advanceNotice: 0, isEmergency: true },
    { id: 'lt-maternity', name: 'Maternity/Paternity', quota: 90, carryForward: false, advanceNotice: 30, isEmergency: false },
  ];

  const leaveTypes = [];
  for (const t of typesData) {
    const lt = await prisma.leaveType.create({
      data: t
    });
    leaveTypes.push(lt);
  }

  // Pre-configured users: Admin only
  const defaultPassword = 'password123';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  console.log('Seeding users hierarchy...');
  const owner = await prisma.user.create({
    data: {
      id: 'usr-owner',
      email: 'ankurak2369@gmail.com',
      name: 'Rahul K.',
      role: 'Admin',
      departmentId: management.id,
      password: hashedPassword
    }
  });

  const seededUsers = [owner];

  console.log('Seeding leave balances for current year...');
  const currentYear = new Date().getFullYear();
  for (const user of seededUsers) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: lt.id,
          balance: lt.quota,
          year: currentYear
        }
      });
    }
  }

  console.log('Seeding mock attendance logs for past 10 days...');
  const today = new Date();
  for (let i = 10; i >= 0; i--) {
    const logDate = new Date();
    logDate.setDate(today.getDate() - i);
    
    // Skip weekends
    if (logDate.getDay() === 0 || logDate.getDay() === 6) continue;

    // Admin punch
    const isLate = i === 3 || i === 7;
    const clockIn = new Date(logDate);
    clockIn.setHours(isLate ? 10 : 9, isLate ? 15 : 0, 0, 0);

    const isOvertime = i === 1 || i === 5;
    const clockOut = new Date(logDate);
    clockOut.setHours(isOvertime ? 20 : 18, 0, 0, 0);

    const adminLog = await prisma.attendanceLog.create({
      data: {
        userId: 'usr-owner',
        clockInTime: clockIn,
        clockOutTime: i === 0 ? null : clockOut,
        workLocation: 'Office',
        ip: '127.0.0.1',
        late: isLate,
        overtime: i === 0 ? false : isOvertime
      }
    });

    if (i === 4) {
      await prisma.attendanceCorrection.create({
        data: {
          attendanceLogId: adminLog.id,
          userId: 'usr-owner',
          requestedClockIn: clockIn,
          requestedClockOut: clockOut,
          reason: 'Clock correction request.',
          status: 'Pending'
        }
      });
    }
  }

  console.log('Seeding mock notifications...');
  const users = ['usr-owner'];
  for (const uid of users) {
    await prisma.notification.createMany({
      data: [
        {
          userId: uid,
          title: 'Welcome to Antbox HR',
          content: 'Your admin account is ready. You can now manage the entire HR system.',
          type: 'general',
          read: false
        },
        {
          userId: uid,
          title: 'System Setup Complete',
          content: 'All core modules are configured and ready to use.',
          type: 'general',
          read: false
        }
      ]
    });
  }

  console.log('Seeding mock announcements...');
  await prisma.announcement.create({
    data: {
      title: 'Annual Team Retreat 2026 Announcement!',
      content: 'We are thrilled to announce that this year’s team retreat will be held in Goa from July 12th to July 15th. Get ready for a week of collaboration, brainstorming, and relaxation! Details regarding flights and accommodation bookings will follow soon.',
    }
  });

  console.log('Seeding mock pulse surveys...');
  const survey = await prisma.pulseSurvey.create({
    data: {
      id: 'srv-satisfaction',
      question: 'How satisfied are you with the remote work schedule flexibility?',
      active: true
    }
  });

  // Seed some anonymous votes
  await prisma.surveyResponse.createMany({
    data: [
      { pulseSurveyId: survey.id, userId: 'usr-owner', rating: 4 },
    ]
  });

  console.log('----------------------------------------');
  console.log('All seeded successfully!');
  console.log('Admin: ankurak2369@gmail.com / password123');
  console.log('----------------------------------------');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
