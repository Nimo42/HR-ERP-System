"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    departmentName: '',
    locationName: '',
    hrEmail: '',
    hrName: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        router.push('/dashboard/it-owner');
      } else {
        alert('Setup failed');
      }
    } catch (e) {
      alert('Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F2EDE6', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
      <div style={{ background: '#fff', padding: '3rem', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div className="auth-logo" style={{ justifyContent: 'center' }}>
            <span>a</span>ntbox Setup
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginTop: '1rem' }}>Organization Configuration</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>Step {step} of 3</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {step === 1 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Company Details</h2>
              <div className="input-group">
                <label>Company Name</label>
                <input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Acme Corp" />
              </div>
              <div className="input-group">
                <label>Industry</label>
                <input name="industry" value={formData.industry} onChange={handleChange} placeholder="e.g. Technology" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Initial Organization Structure</h2>
              <div className="input-group">
                <label>First Department Name</label>
                <input name="departmentName" value={formData.departmentName} onChange={handleChange} placeholder="e.g. Engineering" />
              </div>
              <div className="input-group">
                <label>Headquarters Location</label>
                <input name="locationName" value={formData.locationName} onChange={handleChange} placeholder="e.g. Mumbai HQ" />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>Create HR Manager Account</h2>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>They will handle day-to-day operations and receive an email to set their password.</p>
              <div className="input-group">
                <label>HR Manager Name</label>
                <input name="hrName" value={formData.hrName} onChange={handleChange} placeholder="e.g. Jane Doe" />
              </div>
              <div className="input-group">
                <label>HR Manager Email</label>
                <input type="email" name="hrEmail" value={formData.hrEmail} onChange={handleChange} placeholder="jane.doe@company.com" />
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', gap: '1rem' }}>
            {step > 1 ? (
              <button onClick={handleBack} className="btn-primary" style={{ background: '#fff', color: '#1a1a1a', border: '1px solid #d1ccc5' }}>
                Back
              </button>
            ) : <div />}
            
            {step < 3 ? (
              <button onClick={handleNext} className="btn-primary">
                Continue
              </button>
            ) : (
              <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
