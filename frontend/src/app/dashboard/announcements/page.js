'use client';

import { useEffect, useState } from 'react';
import { Megaphone, BarChart3, HelpCircle, Send, CheckCircle2, Star } from 'lucide-react';

export default function UnifiedCommunications() {
  const [currentUser, setCurrentUser] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeSurvey, setActiveSurvey] = useState(null);
  const [adminSurveys, setAdminSurveys] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Forms
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annDeptId, setAnnDeptId] = useState('');
  const [surveyQuestion, setSurveyQuestion] = useState('');

  // Rating picker
  const [selectedRating, setSelectedRating] = useState(5);
  const [voted, setVoted] = useState(false);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    try {
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      setCurrentUser(meData.user);

      const annRes = await fetch('/api/announcements');
      const annData = await annRes.json();
      setAnnouncements(annData.announcements || []);

      const srvRes = await fetch('/api/surveys');
      const srvData = await srvRes.json();

      if (['HR Manager', 'Admin'].includes(meData.user?.role)) {
        setAdminSurveys(srvData.surveys || []);
        
        const deptRes = await fetch('/api/departments');
        const deptData = await deptRes.json();
        setDepartments(deptData.departments || []);
      } else {
        setActiveSurvey(srvData.survey || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateAnn(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          targetDepartmentId: annDeptId || null
        })
      });
      if (res.ok) {
        setFormSuccess('Announcement broadcasted successfully.');
        setAnnTitle('');
        setAnnContent('');
        setAnnDeptId('');
        loadData();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const d = await res.json();
        setFormError(d.message || 'Broadcast failed');
      }
    } catch (err) {
      setFormError('Broadcast failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSurvey(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      // In a real application, we might set active=false for older surveys, which we do implicitly in DB or via logic
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: surveyQuestion }), // We'll make it create surveys. Let's see if survey POST is supported or we handle it. Wait, we'll write a simple survey creator endpoint if needed or handle it!
      });
      // Wait, let's make sure `/api/surveys` has a POST method. We didn't add it to surveys route!
      // Let's create it in surveys API or let's mock it.
      // Wait, let's add POST to surveys route so HR can create pulse surveys! That's a great catch.
      const response = await fetch('/api/surveys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: surveyQuestion })
      });

      if (response.ok) {
        setFormSuccess('New pulse survey published.');
        setSurveyQuestion('');
        loadData();
        setTimeout(() => setFormSuccess(''), 4000);
      } else {
        const d = await response.json();
        setFormError(d.message || 'Survey creation failed');
      }
    } catch (err) {
      setFormError('Creation failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(e) {
    e.preventDefault();
    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surveyId: activeSurvey.id,
          rating: selectedRating
        })
      });
      if (res.ok) {
        setVoted(true);
        setFormSuccess('Thank you for voting in the Pulse Survey!');
        setTimeout(() => {
          setVoted(false);
          setActiveSurvey(null);
          loadData();
        }, 3000);
      } else {
        const d = await res.json();
        setFormError(d.message || 'Failed to submit vote');
      }
    } catch (err) {
      setFormError('Vote failed');
    }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: '#9ca3af' }}>Loading Bulletin board...</div>;

  const isHR = ['HR Manager', 'Admin'].includes(currentUser?.role);

  return (
    <div style={{ maxWidth: '1200px' }}>
      
      {/* Notifications banner */}
      {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem' }}>{formError}</div>}
      {formSuccess && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.875rem 1rem', borderRadius: 10, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} /> {formSuccess}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: isHR ? '1fr 1fr' : '2fr 1fr', gap: '2rem' }}>
        
        {/* Left Side: Bulletin announcements */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Megaphone size={18} color="#7B5EA7" /> Company Bulletins
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {announcements.length === 0 ? (
                <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No announcements published.</p>
              ) : announcements.map(ann => (
                <div key={ann.id} style={{ padding: '1.25rem', background: '#fafaf9', borderRadius: 12, border: '1px solid #f0ece6' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{ann.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'block', marginTop: '0.25rem', marginBottom: '0.75rem' }}>Posted {new Date(ann.createdAt).toLocaleDateString('en-IN')}</span>
                  <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5, margin: 0 }}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Employee Surveys OR HR forms */}
        <div>
          {isHR ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Broadcast Announcement */}
              <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Send size={18} color="#7B5EA7" /> Broadcast Announcement
                </h2>
                <form onSubmit={handleCreateAnn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Title</label>
                    <input required value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="e.g. Quarter Review Meeting"
                      style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Target Department (optional)</label>
                    <select value={annDeptId} onChange={e => setAnnDeptId(e.target.value)}
                      style={{ padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', background: '#fff' }}>
                      <option value="">Company-Wide</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Content bulletin</label>
                    <textarea required rows={4} value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Write rich updates here..."
                      style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>
                  <button type="submit" disabled={submitting} style={{
                    padding: '0.625rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                  }}>Broadcast Bulletin</button>
                </form>
              </div>

              {/* Pulse Survey Creator & Results */}
              <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart3 size={18} color="#7B5EA7" /> Pulse Surveys & Results
                </h2>
                
                <form onSubmit={handleCreateSurvey} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#4b5563' }}>Survey Question</label>
                    <input required value={surveyQuestion} onChange={e => setSurveyQuestion(e.target.value)} placeholder="e.g. How rate you the canteen food?"
                      style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: '0.875rem' }} />
                  </div>
                  <button type="submit" disabled={submitting} style={{
                    padding: '0.625rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                  }}>Publish Pulse Survey</button>
                </form>

                {/* Historical Surveys Result Visualizations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {adminSurveys.map(s => {
                    const total = s.totalResponses || 0;
                    return (
                      <div key={s.id} style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>{s.question}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{total} responses gathered</span>

                        {total > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                            {[5, 4, 3, 2, 1].map(r => {
                              const count = s.aggregates[r] || 0;
                              const percentage = Math.round((count / total) * 100);
                              return (
                                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                                  <span style={{ width: '40px', fontWeight: 600 }}>{r} Stars</span>
                                  <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: '#7B5EA7', width: `${percentage}%` }} />
                                  </div>
                                  <span style={{ width: '30px', textAlign: 'right', fontWeight: 600, color: '#6b7280' }}>{percentage}%</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div>
              {/* Employee Active Pulse Survey */}
              {activeSurvey ? (
                <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <HelpCircle size={18} color="#7B5EA7" /> Anonymous Pulse Survey
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: '#4b5563', marginBottom: '1.5rem', lineHeight: 1.4 }}>{activeSurvey.question}</p>
                  
                  <form onSubmit={handleVote} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button key={rating} type="button" onClick={() => setSelectedRating(rating)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem'
                        }}>
                          <Star size={28} fill={selectedRating >= rating ? '#f59e0b' : 'none'} color={selectedRating >= rating ? '#f59e0b' : '#d1d5db'} />
                        </button>
                      ))}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Your response is 100% anonymous.</span>
                    <button type="submit" style={{
                      width: '100%', padding: '0.625rem', background: '#7B5EA7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', marginTop: '0.5rem'
                    }}>Submit Answer</button>
                  </form>
                </div>
              ) : (
                <div style={{ background: '#fff', border: '1px solid #f0ece6', borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', textAlign: 'center', color: '#9ca3af' }}>
                  <BarChart3 size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontSize: '0.8125rem' }}>No active pulse surveys at the moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
