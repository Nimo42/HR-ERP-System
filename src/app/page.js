"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Redirect based on role
      switch (data.role) {
        case 'IT Owner':
          router.push('/dashboard/it-owner');
          break;
        case 'HR Manager':
          router.push('/dashboard/hr');
          break;
        case 'Manager':
          router.push('/dashboard/manager');
          break;
        case 'Employee':
          router.push('/dashboard/employee');
          break;
        default:
          router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <span>a</span>ntbox
        </div>
        
        <form className="auth-form" onSubmit={handleLogin}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        
        <div className="auth-links">
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}
