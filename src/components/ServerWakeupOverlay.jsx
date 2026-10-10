import React, { useEffect, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { RefreshCw, AlertCircle, Wallet } from 'lucide-react';

const STATUS_MESSAGES = [
  "Connecting to server...",
  "Waking up the backend...",
  "Establishing secure connection...",
  "Server is warming up...",
  "Almost there, hold tight...",
  "Fetching your financial data...",
  "Authenticating credentials...",
  "Preparing your dashboard...",
  "Just a few more seconds...",
  "Loading your expense tracker..."
];

export default function ServerWakeupOverlay() {
  const { appState, appError, retryConnection } = useApp();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const canvasRef = useRef(null);

  // 1. Particle Canvas Animation Effect
  useEffect(() => {
    if (appState !== 'INITIALIZING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const PARTICLE_COUNT = 75;
    const CONNECT_DIST = 140;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      'rgba(99, 102, 241, ',   // indigo
      'rgba(16, 185, 129, ',   // emerald
      'rgba(139, 92, 246, ',   // violet
      'rgba(14, 165, 233, ',   // sky
      'rgba(244, 63, 94, '     // rose
    ];

    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.3
      });
    }

    let animationFrameId;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.fill();
      });

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const opacity = (1 - dist / CONNECT_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [appState]);

  // 2. Timer & Status Message Cycling
  useEffect(() => {
    if (appState !== 'INITIALIZING') {
      setElapsedSeconds(0);
      return;
    }

    const startTime = Date.now();
    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    const msgInterval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 3500);

    return () => {
      clearInterval(timerInterval);
      clearInterval(msgInterval);
    };
  }, [appState]);

  if (appState === 'READY') return null;

  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const secs = String(elapsedSeconds % 60).padStart(2, '0');

  if (appState === 'ERROR') {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-extrabold text-white">Connection Failed</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {appError || 'Unable to establish connection with backend server. Render server might be offline.'}
            </p>
          </div>
          <button
            onClick={() => retryConnection()}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-between overflow-hidden transition-all duration-500 select-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 pointer-events-none" />

      {/* Top Timer */}
      <div className="relative z-10 pt-16 flex flex-col items-center login-loading-fadein">
        <span
          className="text-6xl font-extrabold text-white tracking-tight font-mono tabular-nums"
          style={{ animation: 'loginTimerPulse 2s ease-in-out infinite' }}
        >
          {mins}:{secs}
        </span>
        <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-semibold">
          ELAPSED
        </p>
      </div>

      {/* Center Status & Pulse Rings */}
      <div className="relative z-10 flex flex-col items-center login-loading-fadein">
        <div className="relative mb-6">
          <div
            className="absolute inset-0 w-20 h-20 rounded-full border-2 border-emerald-500/30"
            style={{ animation: 'loginPulseRing 2.5s ease-in-out infinite' }}
          ></div>
          <div
            className="absolute inset-0 w-20 h-20 rounded-full border border-violet-500/20"
            style={{ animation: 'loginPulseRing2 3s ease-in-out infinite 0.5s' }}
          ></div>
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-violet-500/20 border border-white/10 flex items-center justify-center backdrop-blur-sm shadow-xl">
            <Wallet
              className="w-9 h-9 text-emerald-400"
              style={{ animation: 'loginSpinSlow 8s linear infinite' }}
            />
          </div>
        </div>

        <p className="login-shimmer-text text-sm font-semibold tracking-wide mb-1">
          {STATUS_MESSAGES[msgIndex]}
        </p>
        <p className="text-[11px] text-slate-500 max-w-xs text-center leading-relaxed">
          Our free Render server may take a moment to wake up. Hang tight!
        </p>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 pb-12 text-center">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
          MyMoney Personal Finance • Auto Sync
        </span>
      </div>
    </div>
  );
}
