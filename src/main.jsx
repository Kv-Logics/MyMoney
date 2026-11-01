import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// Auto-reload if a stale chunk fails after a new deployment/commit
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
