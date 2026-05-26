"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send request');
      }

      setStatus({ 
        type: 'success', 
        message: data.message,
        previewUrl: data.previewUrl
      });
      setEmail('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
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
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Reset Password</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>
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
              {status.previewUrl && (
                <div style={{ marginTop: '0.5rem' }}>
                  <a href={status.previewUrl} target="_blank" rel="noreferrer" style={{textDecoration: 'underline'}}>
                    [Dev Mode] Click here to view the Ethereal Test Email
                  </a>
                </div>
              )}
            </div>
          )}
          
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <div className="auth-links">
          <Link href="/">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
