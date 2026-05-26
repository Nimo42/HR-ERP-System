import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import Sidebar from '@/components/Sidebar';

import Topbar from '@/components/Topbar';

export default async function DashboardLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    redirect('/');
  }

  let userRole = 'Employee';
  let userName = 'User';

  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.role) {
      redirect('/');
    }
    userRole = decoded.role;
    userName = decoded.name;
    
    // Redirect IT Owner to setup if needed
    if (userRole === 'IT Owner') {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      const setupComplete = await prisma.orgSetting.findUnique({
        where: { key: 'setupComplete' }
      });
      
      if (!setupComplete || setupComplete.value !== 'true') {
        redirect('/setup');
      }
    }
  } catch (error) {
    redirect('/');
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F2EDE6' }}>
      {/* Sidebar with dynamic RBAC menus */}
      <Sidebar userRole={userRole} />

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        padding: '2rem 3rem', 
        background: '#ffffff',
        borderTopLeftRadius: '24px',
        borderBottomLeftRadius: '24px',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.02)',
        margin: '0.5rem 0',
        overflowY: 'auto'
      }}>
        <Topbar userName={userName} userRole={userRole} />
        
        {children}
      </main>
    </div>
  );
}
