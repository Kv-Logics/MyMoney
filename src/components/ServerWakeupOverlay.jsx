import React, { useEffect, useState, useRef } from 'react';
import { API_BASE } from '../api';
import { useApp } from '../context/AppContext';

export default function ServerWakeupOverlay() {
  const { token, setIsAuthModalOpen, loadAllData } = useApp();
  const [isAwake, setIsAwake] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const canvasRef = useRef(null);

  useEffect(() => {
    const startTime = Date.now();

    const timerInterval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    let animationFrameId;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const PARTICLE_COUNT = 60;
      const CONNECT_DIST = 130;

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      resize();
      window.addEventListener('resize', resize);

      const colors = [
        'rgba(99, 102, 241, ',
        'rgba(16, 185, 129, ',
        'rgba(139, 92, 246, ',
        'rgba(14, 165, 233, ',
        'rgba(244, 63, 94, '
      ];

      const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r: Math.random() * 2 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.5 + 0.3
      }));

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
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(148, 163, 184, ${(1 - dist / CONNECT_DIST) * 0.15})`;
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
    }

    const rootUrl = API_BASE.endsWith('/api') ? API_BASE.slice(0, -4) : API_BASE;
    let isSubscribed = true;

    const checkWakeup = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(rootUrl + '/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          if (isSubscribed) {
            setIsAwake(true);
            clearInterval(timerInterval);
            if (!token) {
              setIsAuthModalOpen(true);
            } else {
              loadAllData();
            }
          }
        } else {
          if (isSubscribed) setTimeout(checkWakeup, 2000);
        }
      } catch (err) {
        if (isSubscribed) setTimeout(checkWakeup, 2000);
      }
    };

    checkWakeup();

    return () => {
      isSubscribed = false;
      clearInterval(timerInterval);
    };
  }, [token, setIsAuthModalOpen, loadAllData]);

  if (isAwake) return null;

  const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const secs = String(elapsedSeconds % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-between overflow-hidden transition-all duration-500">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top Timer */}
      <div className="relative z-10 pt-16 flex flex-col items-center">
        <span className="text-6xl font-extrabold text-slate-800 dark:text-white tracking-tight font-mono animate-pulse">
          {mins}:{secs}
        </span>
        <p className="text-xs text-slate-400 mt-2 uppercase tracking-widest font-semibold">
          ELAPSED
        </p>
      </div>

      {/* Center Status */}
      <div className="relative z-10 flex flex-col items-center text-center p-6 space-y-4">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 flex items-center justify-center text-emerald-600 font-extrabold text-xl shadow-md">
            ⚡
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Connecting to server...</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Our free backend tier spins down after 15 minutes of inactivity.<br />Waking it up now, please stand by...
          </p>
        </div>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 pb-12 text-center">
        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">
          MyMoney Personal Finance • Auto Sync
        </span>
      </div>
    </div>
  );
}
