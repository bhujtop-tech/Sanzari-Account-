import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully handle benign stream cancellation AbortErrors from Firestore WebChannel in preview iframe
window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = typeof reason === 'string' ? reason : reason?.message || '';
  if (
    reason?.name === 'AbortError' ||
    msg.includes('signal is aborted') ||
    msg.includes('aborted without reason') ||
    msg.includes('The user aborted a request')
  ) {
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  const msg = typeof event.message === 'string' ? event.message : '';
  if (
    event.error?.name === 'AbortError' ||
    msg.includes('signal is aborted') ||
    msg.includes('aborted without reason')
  ) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(<App />);

