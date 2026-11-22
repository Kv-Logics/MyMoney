const isNativeApp = typeof window !== 'undefined' && (
  window.Capacitor?.isNativePlatform?.() ||
  window.location.protocol === 'capacitor:' ||
  window.location.origin.includes('capacitor://')
);

// If running inside native Android/iOS app or on production web, route to Render backend.
// Only use local port 8000 if explicitly developing in desktop browser at localhost.
const API_BASE = !isNativeApp && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8000/api'
  : 'https://mymoney-jd0n.onrender.com/api';

export { API_BASE, isNativeApp };

export async function fetchWithAuth(url, options = {}, retries = 2) {
  const token = localStorage.getItem('mymoney_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, { ...options, headers });
    return response;
  } catch (err) {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    // If a network-level error occurred (cold start, socket drop, timeout) on GET or initial load, retry
    if (retries > 0 && (isGet || err.name === 'TypeError')) {
      await new Promise(res => setTimeout(res, 1200));
      return fetchWithAuth(url, options, retries - 1);
    }
    throw err;
  }
}

