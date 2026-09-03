import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Đăng ký Service Worker cho Offline-First PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[SW Registration Error]:', err);
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
