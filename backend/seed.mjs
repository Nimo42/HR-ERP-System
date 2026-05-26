import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Wiping all database tables...');
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

  console.log('Seeding minimal organization configurations...');
  await prisma.orgSetting.createMany({
    data: [
      { key: 'companyName', value: 'Antbox Hive' },
      { key: 'setupComplete', value: 'true' }
    ]
  });

  console.log('Seeding essential leave type policies...');
  const leaveTypesData = [
    { id: 'lt-casual', name: 'Casual Leave', quota: 12, carryForward: true, advanceNotice: 2, isEmergency: false },
    { id: 'lt-sick', name: 'Sick Leave', quota: 10, carryForward: false, advanceNotice: 0, isEmergency: false },
    { id: 'lt-earned', name: 'Earned Leave', quota: 15, carryForward: true, advanceNotice: 7, isEmergency: false },
    { id: 'lt-emergency', name: 'Emergency Leave', quota: 5, carryForward: false, advanceNotice: 0, isEmergency: true },
    { id: 'lt-unpaid', name: 'Unpaid Leave', quota: 365, carryForward: false, advanceNotice: 0, isEmergency: false },
  ];

  for (const t of leaveTypesData) {
    await prisma.leaveType.create({ data: t });
  }

  console.log('Seeding root IT Owner user...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. IT Owner ONLY
  await prisma.user.create({
    data: {
      id: 'usr-owner',
      email: 'ankurak2369@gmail.com',
      name: 'JD',
      role: 'IT Owner',
      password: passwordHash
    }
  });

  console.log('----------------------------------------');
  console.log('Database seeded with bare-minimum data for production start.');
  console.log('IT Owner: ankurak2369@gmail.com / password123');
  console.log('No dummy employees, locations, or departments exist.');
  console.log('----------------------------------------');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
