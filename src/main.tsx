import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Saring error unhandled rejection dari WebSocket HMR di lingkungan sandbox AI Studio agar konsol tetap bersih
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason || '');
    const reasonMsg = String(event?.reason?.message || '');
    if (
      reasonStr.toLowerCase().includes('websocket') ||
      reasonMsg.toLowerCase().includes('websocket')
    ) {
      event.preventDefault();
    }
  });

  const originalError = console.error;
  console.error = (...args) => {
    const errorStr = args.map(arg => String(arg)).join(' ');
    if (
      errorStr.toLowerCase().includes('websocket') ||
      errorStr.toLowerCase().includes('vite: ws') ||
      errorStr.toLowerCase().includes('failed to connect to websocket')
    ) {
      // Abaikan log websocket sisa lingkungan sandbox dev server
      return;
    }
    originalError.apply(console, args);
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
