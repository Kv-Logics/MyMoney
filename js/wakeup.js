// Backend Wake-up Checker and Telemetry Logger

(function() {
  const startTime = Date.now();
  
  // Update the UI timer every 1000ms (MM:SS format)
  const timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');
    
    const display = document.getElementById('wakeup-timer-display');
    if (display) {
      display.innerText = `${mins}:${secs}`;
    }
  }, 1000);

  let wakeupParticlesRAF = null;

  function startWakeupParticles() {
    const canvas = document.getElementById('wakeup-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const PARTICLE_COUNT = 70;
    const CONNECT_DIST = 140;

    function resize() {
      canvas.width = canvas.parentElement.clientWidth || window.innerWidth;
      canvas.height = canvas.parentElement.clientHeight || window.innerHeight;
    }
    resize();
    window._wakeupParticleResize = resize;
    window.addEventListener('resize', resize);

    const colors = [
      'rgba(99, 102, 241, ',
      'rgba(16, 185, 129, ',
      'rgba(139, 92, 246, ',
      'rgba(14, 165, 233, ',
      'rgba(244, 63, 94, ',
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

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
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

      wakeupParticlesRAF = requestAnimationFrame(animate);
    }

    animate();
  }

  function stopWakeupParticles() {
    if (wakeupParticlesRAF) {
      cancelAnimationFrame(wakeupParticlesRAF);
      wakeupParticlesRAF = null;
    }
    if (window._wakeupParticleResize) {
      window.removeEventListener('resize', window._wakeupParticleResize);
      window._wakeupParticleResize = null;
    }
  }

  async function checkBackendWakeup() {
    const apiBase = window.API_BASE || 'https://mymoney-jd0n.onrender.com/api';
    // Strip trailing /api if checking root
    const rootUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;

    try {
      // Ping backend root
      const res = await fetch(rootUrl + '/');
      if (res.ok) {
        // Backend is awake!
        clearInterval(timerInterval);
        
        const totalElapsed = (Date.now() - startTime) / 1000;
        
        // Log telemetry to DB
        await logWakeUpTelemetry(apiBase, totalElapsed);
        
        // Fade out overlay
        const overlay = document.getElementById('server-wakeup-overlay');
        if (overlay) {
          overlay.classList.add('transition-all', 'duration-500', 'opacity-0');
          setTimeout(() => {
            stopWakeupParticles();
            overlay.remove();
          }, 500);
        }
      } else {
        setTimeout(checkBackendWakeup, 2000);
      }
    } catch (err) {
      // Fetch failed, server is likely sleeping
      setTimeout(checkBackendWakeup, 2000);
    }
  }

  async function logWakeUpTelemetry(apiBase, elapsedSeconds) {
    try {
      await fetch(`${apiBase}/telemetry/wakeup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          elapsed_seconds: parseFloat(elapsedSeconds.toFixed(2)),
          user_agent: navigator.userAgent
        })
      });
    } catch (e) {
      console.warn('Could not log wake-up telemetry:', e);
    }
  }

  // Start checking wakeup
  window.addEventListener('DOMContentLoaded', () => {
    // If Lucide is loaded, initialize overlay icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    startWakeupParticles();
    checkBackendWakeup();
  });
})();
