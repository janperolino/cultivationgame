import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App.tsx';
import { startSettings } from './ui/settings.ts';
import { startSound } from './ui/sound/index.ts';
import { startStage } from './ui/stage.ts';
import './ui/theme.css';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');

// Colors, text size and motion go on the page before the first paint.
startSettings();
// The stage's size and zoom follow the window (design.md § UI and screens, The stage).
startStage();
// The sound layer hears the game's moments and follows the screen (S1).
startSound();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
