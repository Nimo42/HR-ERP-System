'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const STEPS = [
  { id: 0, label: 'Look Straight', instruction: 'Face the camera directly. Keep your eyes open and relax.', icon: '👁️' },
  { id: 1, label: 'Turn Slightly Left', instruction: 'Gently rotate your head to your left about 15°.', icon: '↙️' },
  { id: 2, label: 'Turn Slightly Right', instruction: 'Gently rotate your head to your right about 15°.', icon: '↘️' },
];

export default function EnrollPage() {
  const router = useRouter();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [step, setStep] = useState(0); // 0, 1, 2 = capture steps; 3 = done
  const [capturedEmbeddings, setCapturedEmbeddings] = useState([]);
  const [status, setStatus] = useState('initialising'); // initialising | ready | capturing | success | error
  const [statusMsg, setStatusMsg] = useState('Loading face recognition models…');
  const [faceDetected, setFaceDetected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const detectionLoopRef = useRef(null);

  // Load face-api.js from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
    script.async = true;
    script.onload = async () => {
      try {
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        ]);
        setFaceApiLoaded(true);
        setStatusMsg('Models loaded. Starting camera…');
        startCamera();
      } catch (err) {
        setStatus('error');
        setStatusMsg('Failed to load face recognition models. Check your connection and refresh.');
      }
    };
    script.onerror = () => {
      setStatus('error');
      setStatusMsg('Failed to load face-api.js. Check your connection and refresh.');
    };
    document.head.appendChild(script);

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
          setStatus('ready');
          setStatusMsg('Camera ready. Position your face in the circle and click Capture.');
        };
      }
    } catch (err) {
      setStatus('error');
      setStatusMsg('Camera permission denied. Please allow camera access and refresh.');
    }
  };

  const stopCamera = () => {
    if (detectionLoopRef.current) clearInterval(detectionLoopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  // Live face detection loop to indicate face presence
  useEffect(() => {
    if (!cameraReady || !faceApiLoaded) return;
    if (detectionLoopRef.current) clearInterval(detectionLoopRef.current);

    detectionLoopRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi) return;
      try {
        const detection = await window.faceapi.detectSingleFace(
          videoRef.current,
          new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
        );
        setFaceDetected(!!detection);
      } catch (_) {}
    }, 400);

    return () => clearInterval(detectionLoopRef.current);
  }, [cameraReady, faceApiLoaded]);

  const captureStep = async () => {
    if (!videoRef.current || !window.faceapi || !faceDetected) return;
    setStatus('capturing');
    setStatusMsg('Analysing face…');

    try {
      const detection = await window.faceapi
        .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setStatus('ready');
        setStatusMsg('No face detected clearly. Ensure good lighting and try again.');
        return;
      }

      const embedding = Array.from(detection.descriptor); // 128 floats
      const newEmbeddings = [...capturedEmbeddings, embedding];
      setCapturedEmbeddings(newEmbeddings);

      if (newEmbeddings.length < 3) {
        setStep(prev => prev + 1);
        setStatus('ready');
        setStatusMsg(STEPS[newEmbeddings.length].instruction);
      } else {
        // All 3 captures done — send to backend
        await submitEnrollment(newEmbeddings);
      }
    } catch (err) {
      setStatus('ready');
      setStatusMsg('Capture failed. Please try again.');
    }
  };

  const submitEnrollment = async (embeddings) => {
    setSubmitting(true);
    setStatus('capturing');
    setStatusMsg('Saving your face profile…');
    try {
      const res = await fetch('/api/auth/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeddings })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        setStatusMsg('Face enrolled successfully! Redirecting to your dashboard…');
        stopCamera();
        setTimeout(() => router.replace('/dashboard/hr'), 2000);
      } else {
        setStatus('error');
        setStatusMsg(data.message || 'Enrollment failed. Please try again.');
        setSubmitting(false);
      }
    } catch {
      setStatus('error');
      setStatusMsg('Network error during enrollment. Please try again.');
      setSubmitting(false);
    }
  };

  const faceRingColor =
    status === 'success' ? '#10b981' :
    status === 'error' ? '#ef4444' :
    faceDetected ? '#7B5EA7' : '#e5e7eb';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0a1e 0%, #1a1035 50%, #0f0a1e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: 700, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(123,94,167,0.15)', border: '1px solid rgba(123,94,167,0.3)', borderRadius: 9999, padding: '0.375rem 1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5f4', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              One-Time Setup
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
            Face Enrollment
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', margin: 0 }}>
            This sets up your face ID for daily attendance. It only takes 30 seconds.
          </p>
        </div>

        {/* Step Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
          {STEPS.map((s, i) => {
            const done = i < capturedEmbeddings.length;
            const active = i === step && capturedEmbeddings.length < 3;
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: 9999,
                background: done ? 'rgba(16,185,129,0.15)' : active ? 'rgba(123,94,167,0.3)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? 'rgba(16,185,129,0.4)' : active ? 'rgba(123,94,167,0.6)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.3s'
              }}>
                <span style={{ fontSize: '1rem' }}>{done ? '✓' : s.icon}</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: done || active ? 600 : 400, color: done ? '#6ee7b7' : active ? '#c4b5f4' : 'rgba(255,255,255,0.4)' }}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 24,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>

          {/* Camera Frame */}
          <div style={{ position: 'relative', width: 320, height: 320 }}>
            {/* Animated ring */}
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: `4px solid ${faceRingColor}`,
              transition: 'border-color 0.3s',
              boxShadow: faceDetected ? `0 0 30px ${faceRingColor}44` : 'none',
              zIndex: 2,
              pointerEvents: 'none'
            }} />
            {/* Clip to circle */}
            <div style={{
              width: '100%', height: '100%',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#0a0512'
            }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  transform: 'scaleX(-1)',
                  display: cameraReady ? 'block' : 'none'
                }}
              />
              {!cameraReady && (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '0.75rem'
                }}>
                  <div style={{
                    width: 40, height: 40,
                    border: '3px solid rgba(123,94,167,0.3)',
                    borderTop: '3px solid #7B5EA7',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem' }}>
                    {status === 'error' ? '⚠️ Error' : 'Starting…'}
                  </span>
                </div>
              )}
            </div>

            {/* Face detected indicator */}
            {cameraReady && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: faceDetected ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.7)',
                color: faceDetected ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', padding: '0.25rem 0.75rem', borderRadius: 9999,
                transition: 'all 0.3s', zIndex: 3, whiteSpace: 'nowrap'
              }}>
                {faceDetected ? '● Face Detected' : '○ No Face'}
              </div>
            )}
          </div>

          {/* Status Message */}
          <div style={{
            background: status === 'success' ? 'rgba(16,185,129,0.15)' : status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(123,94,167,0.15)',
            border: `1px solid ${status === 'success' ? 'rgba(16,185,129,0.3)' : status === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(123,94,167,0.3)'}`,
            borderRadius: 12, padding: '1rem 1.5rem', textAlign: 'center', width: '100%', boxSizing: 'border-box'
          }}>
            {capturedEmbeddings.length < 3 && status !== 'success' && status !== 'error' && (
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#c4b5f4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.375rem' }}>
                Step {step + 1} of 3 — {STEPS[step]?.label}
              </div>
            )}
            <p style={{
              margin: 0, fontSize: '0.9375rem', fontWeight: 500,
              color: status === 'success' ? '#6ee7b7' : status === 'error' ? '#fca5a5' : 'rgba(255,255,255,0.85)'
            }}>
              {statusMsg}
            </p>
          </div>

          {/* Action Button */}
          {status !== 'success' && (
            <button
              onClick={captureStep}
              disabled={!cameraReady || !faceDetected || status === 'capturing' || status === 'error' || submitting}
              style={{
                width: '100%', padding: '1rem',
                background: (!cameraReady || !faceDetected || status === 'capturing' || submitting)
                  ? 'rgba(123,94,167,0.3)'
                  : 'linear-gradient(135deg, #7B5EA7, #6d50a0)',
                color: '#fff', border: 'none', borderRadius: 14,
                fontSize: '1rem', fontWeight: 700, cursor: (!cameraReady || !faceDetected || status === 'capturing' || submitting) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: (cameraReady && faceDetected && status !== 'capturing') ? '0 8px 24px rgba(123,94,167,0.4)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}
            >
              {status === 'capturing' || submitting
                ? <>
                    <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    {submitting ? 'Saving profile…' : 'Capturing…'}
                  </>
                : `📸  Capture Step ${capturedEmbeddings.length + 1}`
              }
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={() => { setStatus('ready'); setStatusMsg(STEPS[step]?.instruction || 'Position your face and capture.'); }}
              style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '0.75rem 2rem', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Try Again
            </button>
          )}
        </div>

        {/* Privacy note */}
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', marginTop: '1.5rem' }}>
          🔒 Only a mathematical embedding is stored — no photos or videos are saved. Processing happens in your browser.
        </p>
      </div>
    </div>
  );
}


