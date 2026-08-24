import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

/**
 * Entry point.
 *
 * StrictMode is on. It double-invokes effects and renders in development, which is
 * the point: this app has exactly one write path (`POST /api/orders`) and it must not
 * fire twice. It lives in a mutation behind a click handler rather than in an effect
 * precisely so that double-invocation cannot create two orders - and leaving
 * StrictMode on is what keeps that honest as the app grows.
 */
const container = document.getElementById('root');
if (!container) {
  throw new Error('index.html is missing <div id="root">.');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
