'use client';

import { useEffect, useRef, useState } from 'react';

function calculateEAR(eye) {
  const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const p1 = eye[0], p2 = eye[1], p3 = eye[2];
  const p4 = eye[3], p5 = eye[4], p6 = eye[5];
  return (dist(p2, p6) + dist(p3, p5)) / (2 * dist(p1, p4));
}

async function safeJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function FaceScanModal({ action, workLocation, onSuccess, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);

  const [phase, setPhase] = useState('loading');
  const [msg, setMsg] = useState('Loading face recognition...');
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinkDone, setBlinkDone] = useState(false);

  const blinkDetectedRef = useRef(false);
  const blinkArmedRef = useRef(false);
  const closedFramesRef = useRef(0);
  const openFramesAfterCloseRef = useRef(0);

  const EAR_THRESHOLD_CLOSE = 0.23;
  const EAR_THRESHOLD_OPEN = 0.27;
  const MIN_CLOSED_FRAMES = 2;
  const MIN_OPEN_FRAMES_AFTER_CLOSE = 2;
  const stableFaceFramesRef = useRef(0);
  const MIN_STABLE_FACE_FRAMES = 4;

  useEffect(() => {
    const existing = document.getElementById('face-api-script');
    if (existing) {
      if (window.faceapi?.nets?.tinyFaceDetector?.params) {
        initCamera();
      } else {
        existing.addEventListener('load', initModels);
      }
      return cleanup;
    }

    const script = document.createElement('script');
    script.id = 'face-api-script';
    script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/dist/face-api.js';
    script.async = true;
    script.onload = initModels;
    script.onerror = () => {
      setPhase('error');
      setMsg('Failed to load face recognition library. Check your connection.');
    };
    document.head.appendChild(script);
    return cleanup;
  }, []);

  async function initModels() {
    try {
      if (!window.faceapi.nets.tinyFaceDetector.params) {
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model';
        await Promise.all([
          window.faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          window.faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
          window.faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        ]);
      }
      await initCamera();
    } catch {
      setPhase('error');
      setMsg('Failed to load face recognition models.');
    }
  }

  async function initCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setPhase('waiting-blink');
            setMsg('Look at the camera for face verification.');
            startBlinkLoop();
          };
      }
    } catch {
      setPhase('error');
      setMsg('Camera permission denied. Please allow camera access.');
    }
  }

  function resetBlinkState() {
    blinkDetectedRef.current = false;
    blinkArmedRef.current = false;
    closedFramesRef.current = 0;
    openFramesAfterCloseRef.current = 0;
    stableFaceFramesRef.current = 0;
    setBlinkDone(false);
  }

  function startBlinkLoop() {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = setInterval(async () => {
      if (!videoRef.current || !window.faceapi || blinkDetectedRef.current) return;

      try {
        const result = await window.faceapi
          .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
          .withFaceLandmarks();

        if (!result) {
          setFaceDetected(false);
          stableFaceFramesRef.current = 0;
          blinkArmedRef.current = false;
          closedFramesRef.current = 0;
          openFramesAfterCloseRef.current = 0;
          return;
        }

        setFaceDetected(true);
        stableFaceFramesRef.current += 1;

        const lm = result.landmarks.positions;
        const leftEye = lm.slice(36, 42).map((p) => ({ x: p.x, y: p.y }));
        const rightEye = lm.slice(42, 48).map((p) => ({ x: p.x, y: p.y }));
        const ear = (calculateEAR(leftEye) + calculateEAR(rightEye)) / 2;

        if (ear < EAR_THRESHOLD_CLOSE) {
          closedFramesRef.current += 1;
          openFramesAfterCloseRef.current = 0;
          if (closedFramesRef.current >= MIN_CLOSED_FRAMES) {
            blinkArmedRef.current = true;
          }
        } else if (ear > EAR_THRESHOLD_OPEN && blinkArmedRef.current) {
          openFramesAfterCloseRef.current += 1;
          if (openFramesAfterCloseRef.current >= MIN_OPEN_FRAMES_AFTER_CLOSE) {
            blinkDetectedRef.current = true;
          }
        } else {
          if (!blinkArmedRef.current) {
            closedFramesRef.current = 0;
          }
          openFramesAfterCloseRef.current = 0;
        }

        if (stableFaceFramesRef.current >= MIN_STABLE_FACE_FRAMES) {
          clearInterval(loopRef.current);
          setBlinkDone(true);
          await captureAndVerify();
        }
      } catch {
        // keep loop alive
      }
    }, 120);
  }

  async function captureAndVerify() {
    setPhase('capturing');
    setMsg('Face detected. Verifying your identity...');

    try {
      const result = await window.faceapi
        .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!result) {
        setPhase('error');
        setMsg('Could not get a clear face reading. Please try again.');
        return;
      }

      const liveEmbedding = Array.from(result.descriptor);
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workLocation, liveEmbedding })
      });

      const data = await safeJson(res);
      if (!data) {
        setPhase('error');
        setMsg('Server returned invalid response. Please sign in again and retry.');
        return;
      }

      if (res.ok) {
        setPhase('done');
        setMsg(data.action === 'clock-in' ? 'Clocked in successfully.' : 'Clocked out successfully.');
        stopCamera();
        setTimeout(() => onSuccess(data), 1000);
      } else {
        setPhase('error');
        setMsg(data.message || 'Face not recognized. Please try again.');
      }
    } catch {
      setPhase('error');
      setMsg('Verification failed. Network error.');
    }
  }

  function stopCamera() {
    if (loopRef.current) clearInterval(loopRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  }

  function cleanup() {
    stopCamera();
  }

  function retry() {
    resetBlinkState();
    setPhase('waiting-blink');
    setMsg('Look at the camera for face verification.');
    startBlinkLoop();
  }

  const ringColor =
    phase === 'done' ? '#10b981' :
    phase === 'error' ? '#ef4444' :
    blinkDone ? '#10b981' :
    faceDetected ? '#7B5EA7' : '#4b5563';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1035, #0f0a1e)',
        border: '1px solid rgba(123,94,167,0.3)',
        borderRadius: 24,
        padding: '2rem',
        maxWidth: 420, width: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c4b5f4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.375rem' }}>
            Face Verification
          </div>
          <h2 style={{ color: '#fff', margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
            {action === 'clock-in' ? 'Clock In' : 'Clock Out'} - {workLocation}
          </h2>
        </div>

        <div style={{ position: 'relative', width: 240, height: 240 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `3px solid ${ringColor}`,
            boxShadow: (phase !== 'error' && faceDetected) ? `0 0 24px ${ringColor}55` : 'none',
            transition: 'all 0.3s', zIndex: 2, pointerEvents: 'none'
          }} />
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#080412' }}>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: phase !== 'loading' ? 'block' : 'none'
              }}
            />
            {phase === 'loading' && (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, border: '3px solid rgba(123,94,167,0.3)', borderTop: '3px solid #7B5EA7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>

          {phase === 'waiting-blink' && (
            <div style={{
              position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
              background: faceDetected ? 'rgba(123,94,167,0.9)' : 'rgba(0,0,0,0.7)',
              color: '#fff', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '0.2rem 0.625rem', borderRadius: 9999, zIndex: 3, whiteSpace: 'nowrap'
            }}>
              {faceDetected ? 'Waiting for blink...' : 'No face detected'}
            </div>
          )}
        </div>

        <div style={{
          width: '100%',
          background: phase === 'done' ? 'rgba(16,185,129,0.15)' : phase === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(123,94,167,0.1)',
          border: `1px solid ${phase === 'done' ? 'rgba(16,185,129,0.3)' : phase === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(123,94,167,0.2)'}`,
          borderRadius: 12, padding: '0.875rem 1rem', textAlign: 'center', boxSizing: 'border-box'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: phase === 'done' ? '#6ee7b7' : phase === 'error' ? '#fca5a5' : 'rgba(255,255,255,0.8)' }}>
            {msg}
          </p>
        </div>

        {phase === 'waiting-blink' && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ fontSize: '1.75rem', animation: 'blink-anim 2s infinite' }}>Face</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8125rem' }}>Hold still for verification</div>
            <style>{`@keyframes blink-anim { 0%,90%,100%{opacity:1} 95%{opacity:0.1} }`}</style>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
          {phase === 'error' && (
            <button
              onClick={retry}
              style={{
                flex: 1, padding: '0.75rem', background: 'rgba(123,94,167,0.3)',
                border: '1px solid rgba(123,94,167,0.5)', color: '#c4b5f4',
                borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => { stopCamera(); onCancel(); }}
            style={{
              flex: 1, padding: '0.75rem', background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)',
              borderRadius: 10, fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
