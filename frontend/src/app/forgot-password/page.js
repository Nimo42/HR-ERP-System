"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function ForgotPassword() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const glowRef = useRef(null);
  const checks = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const isPasswordValid = checks.length && checks.number && checks.uppercase && checks.lowercase && checks.special;
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  useEffect(() => {
    const qEmail = searchParams.get('email');
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.pageX + 'px';
        glowRef.current.style.top = e.pageY + 'px';
        glowRef.current.style.opacity = '1';
      }
    };
    const handleMouseLeave = () => {
      if (glowRef.current) glowRef.current.style.opacity = '0';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });
    setLoading(true);
    try {
      if (!isPasswordValid) throw new Error('Password does not meet all strength requirements');
      if (!passwordsMatch) throw new Error('Passwords do not match');
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update password');
      setStatus({ type: 'success', message: data.message || 'Password updated successfully.' });
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ambient min-h-screen overflow-y-auto flex flex-col justify-between relative font-body-md text-on-surface pb-6">
      <div className="glow-effect" id="glow" ref={glowRef} />
      <header className="w-full flex justify-center items-center px-gutter z-10 relative animate-fade-up pt-10 pb-0">
        <div className="flex items-center bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-full overflow-hidden border border-purple-200/50 scale-125 transition-transform duration-300 hover:scale-130">
          <div className="bg-white px-6 py-2.5 flex items-center justify-center min-w-[110px]">
            <span className="text-[#7B5EA7] text-2xl font-bold tracking-widest" style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.1em" }}>
              antbox
            </span>
          </div>
          <div className="bg-[#7B5EA7] px-6 py-2.5 flex items-center justify-center min-w-[110px] border-l border-purple-200/20">
            <span className="text-white text-2xl font-bold tracking-widest" style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.1em" }}>
              hive
            </span>
          </div>
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center justify-center px-margin-x z-10 relative gap-3.5 py-2">
        <div className="w-full max-w-[420px] flex flex-col items-center animate-fade-up delay-100 mt-1">
          <h2 className="font-headline-lg text-primary mb-1 text-center text-2xl md:text-3xl font-semibold">Forgot Password</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-4 text-center">Enter your email and reset password</p>

          {status.message && (
            <div style={{
              background: status.type === 'error' ? '#fee2e2' : '#d1fae5',
              color: status.type === 'error' ? '#dc2626' : '#065f46',
              padding: '0.625rem 0.875rem',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              width: '100%',
              marginBottom: '1rem',
              border: status.type === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0',
              textAlign: 'center',
              zIndex: 20
            }}>
              <div>{status.message}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="email">Email</label>
              <input className="min-h-[48px] px-3.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm outline-none"
                id="email" name="email" type="email" placeholder="name@company.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="password">New password</label>
              <div className="relative w-full">
                <input className="min-h-[48px] w-full px-3.5 pr-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm outline-none"
                  id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder="New password" required value={password} onChange={(e) => setPassword(e.target.value)} onFocus={() => setFocusPassword(true)} onBlur={() => setFocusPassword(false)} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {focusPassword && (
                <div className="w-full bg-white border border-purple-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-3.5 flex flex-col gap-2 mt-1.5">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-wide">Password Requirements</h4>
                  <div className="flex flex-col gap-1 text-[10px] text-on-surface-variant">
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]" style={{ color: checks.length ? '#10b981' : '#ef4444' }}>{checks.length ? 'check_circle' : 'cancel'}</span><span>8 characters or more</span></div>
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]" style={{ color: checks.uppercase ? '#10b981' : '#6b7280' }}>{checks.uppercase ? 'check_circle' : 'circle'}</span><span>Contains uppercase letter (A-Z)</span></div>
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]" style={{ color: checks.lowercase ? '#10b981' : '#6b7280' }}>{checks.lowercase ? 'check_circle' : 'circle'}</span><span>Contains lowercase letter (a-z)</span></div>
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]" style={{ color: checks.number ? '#10b981' : '#6b7280' }}>{checks.number ? 'check_circle' : 'circle'}</span><span>Contains number (0-9)</span></div>
                    <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[12px]" style={{ color: checks.special ? '#10b981' : '#6b7280' }}>{checks.special ? 'check_circle' : 'circle'}</span><span>Contains special character (!@#$*)</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="confirmPassword">Confirm password</label>
              <div className="relative w-full">
                <input className="min-h-[48px] w-full px-3.5 pr-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm outline-none"
                  id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              {confirmPassword.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] mt-0.5" style={{ color: passwordsMatch ? '#10b981' : '#ef4444' }}>
                  <span className="material-symbols-outlined text-[12px]">
                    {passwordsMatch ? 'check_circle' : 'cancel'}
                  </span>
                  <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                </div>
              )}
            </div>
            <button className="w-full min-h-[48px] bg-primary text-on-primary rounded-lg font-body-md text-sm font-medium mt-2" type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          <div className="z-10 mt-2">
            <Link href="/" className="font-body-md text-xs text-secondary px-5 py-2.5 rounded-full">Back to login</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
