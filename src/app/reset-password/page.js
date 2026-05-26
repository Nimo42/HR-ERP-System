"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!token) {
      setStatus({ type: 'error', message: 'Missing reset token.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setStatus({ type: 'success', message: 'Password reset successful. Redirecting to login...' });
      
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-form" style={{ textAlign: 'center' }}>
        <div style={{ color: '#dc2626', marginBottom: '1rem' }}>
          Invalid or missing reset token.
        </div>
        <Link href="/forgot-password" style={{ textDecoration: 'underline' }}>Request a new one</Link>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Set New Password</h1>
      </div>

      {status.message && (
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '8px', 
          fontSize: '0.875rem',
          textAlign: 'center',
          backgroundColor: status.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: status.type === 'error' ? '#991b1b' : '#166534',
        }}>
          {status.message}
        </div>
      )}
      
      <div className="input-group">
        <input 
          type="password" 
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
        />
      </div>

      <div className="input-group">
        <input 
          type="password" 
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required 
        />
      </div>
      
      <button type="submit" className="btn-primary" disabled={loading || status.type === 'success'}>
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}

export default function ResetPassword() {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span>a</span>ntbox
        </div>
        
        <Suspense fallback={<div style={{textAlign: 'center'}}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
        
      </div>
    </div>
  );
}
