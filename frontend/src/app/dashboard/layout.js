import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import EnrollmentGate from '@/components/EnrollmentGate';

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  let userRole = 'Employee';
  let userName = 'User';
  let shouldRedirectToLogin = false;

  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.role) {
      shouldRedirectToLogin = true;
    } else {
      userRole = decoded.role;
      userName = decoded.name;
    }
  } catch (error) {
    console.error('Dashboard layout error:', error);
    shouldRedirectToLogin = true;
  }

  if (shouldRedirectToLogin) {
    redirect('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F2EDE6' }}>
      <EnrollmentGate />
      {/* Sidebar with dynamic RBAC menus */}
      <Sidebar userRole={userRole} userName={userName} />

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        padding: '2.5rem 3rem', 
        background: '#F4F0EB',
        overflowY: 'auto'
      }}>
        <Topbar userName={userName} userRole={userRole} />
        
        {children}
      </main>
    </div>
  );
}
