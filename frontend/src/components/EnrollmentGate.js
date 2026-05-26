"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function EnrollmentGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Avoid redirect loop when already on the enrollment page
    if (pathname === '/dashboard/enroll') return;

    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) return null;
        return safeJson(res);
      })
      .then((data) => {
        if (data?.user) {
          const { role, faceEnrolled } = data.user;
          // Only Employee and HR Manager are required to do face verification
          if (['HR Manager', 'Employee'].includes(role) && !faceEnrolled) {
            router.replace('/dashboard/enroll');
          }
        }
      })
      .catch((err) => {
        console.error('EnrollmentGate verification failed:', err);
      });
  }, [pathname, router]);

  return null;
}
