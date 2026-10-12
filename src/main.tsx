import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import { startSettings } from './ui/settings.ts';
import './ui/theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');

// Colors, text size and motion go on the page before the first paint.
startSettings();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
