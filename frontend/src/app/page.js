"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const glowRef = useRef(null);

  // Mouse tracking glow effect for background ambiance
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
        if (data?.requirePasswordReset) {
          router.push(`/forgot-password?email=${encodeURIComponent(data.email || email)}`);
          return;
        }
        throw new Error(data.message || 'Login failed');
      }

      // Redirect based on role
      switch (data.role) {
        case 'Admin':
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
    <div className="bg-ambient min-h-screen overflow-y-auto flex flex-col justify-between relative font-body-md text-on-surface pb-6">
      {/* Mouse Tracking Glow */}
      <div className="glow-effect" id="glow" ref={glowRef} />

      {/* TopAppBar */}
      <header className="w-full flex justify-center items-center px-gutter z-10 relative animate-fade-up pt-6 pb-2">
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
      <main className="flex-grow flex flex-col items-center justify-center px-margin-x z-10 relative gap-3.5 py-2">
        
        {/* Hero Quote */}
        <div className="animate-fade-up text-center px-4 max-w-2xl opacity-75">
          <h1 className="font-body-md text-base md:text-lg text-on-surface-variant font-normal tracking-wide italic">
            "The platform that bridges <span className="text-secondary font-semibold not-italic">talent</span> with opportunity."
          </h1>
        </div>

        {/* Sign-in Card */}
        <div className="w-full max-w-[420px] flex flex-col items-center animate-fade-up delay-100 mt-1">
          <h2 className="font-headline-lg text-primary mb-1 text-center text-2xl md:text-3xl font-semibold">Welcome back</h2>
          <p className="font-body-md text-sm text-on-surface-variant mb-4 text-center">Sign in to your workspace</p>
          
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.625rem 0.875rem', borderRadius: '8px', fontSize: '0.8125rem', width: '100%', marginBottom: '1rem', border: '1px solid #fca5a5', textAlign: 'center', zIndex: 20 }}>
              {error === 'Invalid credentials' ? 'Invalid email or password' : error}
            </div>
          )}
 
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-4 bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-shadow duration-300 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] group">
            
            <div className="flex flex-col gap-1.5">
              <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="email">Work email</label>
              <input 
                className="min-h-[48px] px-3.5 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-on-surface font-body-md text-sm focus:border-secondary focus:ring-1 focus:ring-secondary hover:border-outline transition-all duration-200 outline-none" 
                id="email" 
                name="email" 
                type="email" 
                placeholder="you@company.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
 
            <div className="flex flex-col gap-1.5 relative">
              <label className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold" htmlFor="password">Password</label>
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
            </div>
 
            <button 
              className="w-full min-h-[48px] bg-primary text-on-primary rounded-lg font-body-md text-sm font-medium mt-2 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:bg-inverse-surface transition-all duration-300 flex items-center justify-center gap-2" 
              type="submit"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in ->'}
            </button>
 
            <div className="flex justify-center items-center mt-1">
              <Link className="font-label-sm text-xs text-secondary hover:text-secondary-container transition-colors duration-200" href="/forgot-password">
                Forgot password?
              </Link>
            </div>
 
          </form>
          
          <p className="text-[11px] text-on-surface-variant mt-4 text-center font-medium">
            Your role is detected automatically on sign-in
          </p>
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
