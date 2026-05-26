const baseUrl = process.env.PAYROLL_AUTOMATION_BASE_URL || 'http://localhost:3001';
const secret = process.env.PAYROLL_CRON_SECRET;

if (!secret) {
  console.error('Missing PAYROLL_CRON_SECRET in environment.');
  process.exit(1);
}

const run = async () => {
  const res = await fetch(`${baseUrl}/api/payroll/month-end`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payroll-secret': secret
    },
    body: JSON.stringify({})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Month-end payroll failed:', data);
    process.exit(1);
  }

  console.log('Month-end payroll response:', data);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

