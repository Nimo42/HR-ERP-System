"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);

  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Validation checks
  const checks = {
    length: password.length >= 8,
    number: /[0-9]/.test(password),
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isPasswordValid = checks.length; // Pass if 8 characters or more
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ type: '', message: '' });

    if (!token) {
      setStatus({ type: 'error', message: 'Missing reset token.' });
      return;
    }

    if (!isPasswordValid) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
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
      }, 2500);
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full flex flex-col items-center bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 text-center">
        <span className="material-symbols-outlined text-error text-[48px] mb-2">error</span>
        <h3 className="font-semibold text-lg text-primary mb-1">Invalid or Expired Token</h3>
        <p className="text-sm text-on-surface-variant mb-4">The password reset link is invalid, corrupted, or has expired.</p>
        <Link href="/forgot-password" className="font-body-md text-sm text-secondary hover:underline">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] group relative">
      
      {status.message && (
        <div style={{ 
          background: status.type === 'error' ? '#fee2e2' : '#d1fae5', 
          color: status.type === 'error' ? '#dc2626' : '#065f46', 
          padding: '0.625rem 0.875rem', 
          borderRadius: '8px', 
          fontSize: '0.8125rem', 
          width: '100%', 
          border: status.type === 'error' ? '1px solid #fca5a5' : '1px solid #a7f3d0', 
          textAlign: 'center', 
          zIndex: 20 
        }}>
          {status.message}
        </div>
      )}

      {/* New Password Field */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="password">New Password</label>
        <div className="relative w-full">
          <input 
            className="w-full min-h-[48px] pl-3.5 pr-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm focus:border-secondary focus:ring-1 focus:ring-secondary hover:border-outline transition-all duration-200 outline-none" 
            id="password" 
            name="password" 
            type={showPassword ? "text" : "password"} 
            placeholder="••••••••" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusPassword(true)}
            onBlur={() => setFocusPassword(false)}
          />
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary focus:outline-none flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[20px]">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        </div>

        {/* Requirements Box (Pushes content down, scrollable page ensures visibility) */}
        {focusPassword && (
          <div className="w-full bg-white border border-purple-200 shadow-[0_4px_20px_rgba(0,0,0,0.05)] rounded-xl p-3.5 flex flex-col gap-2 animate-fade-up mt-1.5">
            <h4 className="text-[10px] font-bold text-primary uppercase tracking-wide">Password Requirements</h4>
            <div className="flex flex-col gap-1 text-[10px] text-on-surface-variant">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ color: checks.length ? '#10b981' : '#ef4444' }}>
                  {checks.length ? 'check_circle' : 'cancel'}
                </span>
                <span className={checks.length ? 'font-medium text-secondary' : ''}>8 characters or more (Required)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ color: checks.uppercase ? '#10b981' : '#6b7280' }}>
                  {checks.uppercase ? 'check_circle' : 'circle'}
                </span>
                <span>Contains uppercase letter (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ color: checks.lowercase ? '#10b981' : '#6b7280' }}>
                  {checks.lowercase ? 'check_circle' : 'circle'}
                </span>
                <span>Contains lowercase letter (a-z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ color: checks.number ? '#10b981' : '#6b7280' }}>
                  {checks.number ? 'check_circle' : 'circle'}
                </span>
                <span>Contains number (0-9)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[12px]" style={{ color: checks.special ? '#10b981' : '#6b7280' }}>
                  {checks.special ? 'check_circle' : 'circle'}
                </span>
                <span>Contains special character (!@#$*)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="flex flex-col gap-1.5 relative">
        <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="confirmPassword">Confirm Password</label>
        <div className="relative w-full">
          <input 
            className="w-full min-h-[48px] pl-3.5 pr-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm focus:border-secondary focus:ring-1 focus:ring-secondary hover:border-outline transition-all duration-200 outline-none" 
            id="confirmPassword" 
            name="confirmPassword" 
            type={showConfirmPassword ? "text" : "password"} 
            placeholder="••••••••" 
            required 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button 
            type="button" 
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary focus:outline-none flex items-center justify-center"
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

      <button 
        className="w-full min-h-[48px] bg-primary text-on-primary rounded-lg font-body-md text-sm font-medium mt-2 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:bg-inverse-surface transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none" 
        type="submit"
        disabled={loading || !isPasswordValid || !passwordsMatch || status.type === 'success'}
      >
        {loading ? 'Updating...' : 'Update Password'}
        {!loading && (
          <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
        )}
      </button>

    </form>
  );
}

export default function ResetPassword() {
  const glowRef = useRef(null);

  // Mouse tracking glow effect
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        glowRef.current.style.left = e.pageX + 'px';
        glowRef.current.style.top = e.pageY + 'px';
        glowRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div className="bg-ambient min-h-screen overflow-y-auto flex flex-col justify-between relative font-body-md text-on-surface pb-6">
      {/* Mouse Tracking Glow */}
      <div className="glow-effect" id="glow" ref={glowRef} />

      {/* TopAppBar */}
      <header className="w-full flex justify-center items-center px-gutter z-10 relative animate-fade-up pt-10 pb-0">
        <div className="flex items-center bg-white shadow-[0_12px_40px_rgba(0,0,0,0.06)] rounded-full overflow-hidden border border-purple-200/50 scale-125 transition-transform duration-300 hover:scale-130">
          {/* Left Side: Antbox (White background, purple text) */}
          <div className="bg-white px-6 py-2.5 flex items-center justify-center min-w-[110px]">
            <span className="text-[#7B5EA7] text-2xl font-bold tracking-widest" style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.1em" }}>
              antbox
            </span>
          </div>
          {/* Right Side: Hive (Purple background, white cursive separate letters) */}
          <div className="bg-[#7B5EA7] px-6 py-2.5 flex items-center justify-center min-w-[110px] border-l border-purple-200/20">
            <span className="text-white text-2xl font-bold tracking-widest" style={{ fontFamily: "'Caveat', cursive", letterSpacing: "0.1em" }}>
              hive
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-margin-x z-10 relative gap-3 py-2">
        
        {/* Hero Quote */}
        <div className="animate-fade-up text-center px-4 max-w-2xl opacity-75 mt-4">
          <h1 className="font-body-md text-base md:text-lg text-on-surface-variant font-normal tracking-wide italic">
            "Create a new password that is secure and easy to remember."
          </h1>
        </div>

        {/* Card Container */}
        <div className="w-full max-w-[420px] flex flex-col items-center animate-fade-up delay-100 mt-1">
          <h2 className="font-headline-lg text-primary mb-1 text-center text-2xl md:text-3xl font-semibold">Set New Password</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-4 text-center">Configure secure credentials for your account</p>
          
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading security check...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>

        <div className="z-10 mt-2">
          <Link href="/" className="font-body-md text-xs text-secondary border border-secondary/20 hover:border-secondary/40 bg-white/50 hover:bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] px-5 py-2.5 rounded-full transition-all duration-300 flex items-center gap-1.5 font-semibold">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            Back to login
          </Link>
        </div>

      </main>

      {/* Footer */}
      <footer className="w-full py-3 bg-transparent mt-auto z-10 relative">
        <div className="max-w-container-max mx-auto px-margin-x flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="font-body-md text-xs text-on-surface-variant">© 2024 Antbox Hive. All rights reserved.</div>
          <div className="flex gap-4">
            <a className="font-body-md text-xs text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Terms of Service</a>
            <a className="font-body-md text-xs text-on-surface-variant hover:text-primary transition-colors duration-200" href="#">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
