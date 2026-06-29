// Backend Wake-up Checker and Telemetry Logger

(function() {
  const startTime = Date.now();
  let elapsed = 0;
  
  // Update the UI timer every 100ms
  const timerInterval = setInterval(() => {
    elapsed = (Date.now() - startTime) / 1000;
    const display = document.getElementById('wakeup-timer-display');
    if (display) {
      display.innerText = elapsed.toFixed(1) + 's';
    }
  }, 100);

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
    checkBackendWakeup();
  });
})();
