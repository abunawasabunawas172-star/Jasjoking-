import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Saring error unhandled rejection dari WebSocket HMR di lingkungan sandbox AI Studio agar konsol tetap bersih
if (typeof window !== 'undefined') {
  const isWsError = (str: string) => {
    const lower = str.toLowerCase();
    return lower.includes('websocket') || lower.includes('closed without opened') || lower.includes('failed to connect') || lower.includes('vite');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = String(event?.reason || '');
    const reasonMsg = String(event?.reason?.message || '');
    if (isWsError(reasonStr) || isWsError(reasonMsg)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    const errorMsg = String(event?.message || '');
    const errorObjStr = String(event?.error || '');
    if (isWsError(errorMsg) || isWsError(errorObjStr)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  const originalError = console.error;
  console.error = (...args) => {
    const errorStr = args.map(arg => String(arg)).join(' ');
    if (isWsError(errorStr)) {
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
