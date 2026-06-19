import React from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
// CHANGE: Add the following import
import { defineCustomElements } from '@ionic/pwa-elements/loader';
// import { ShiftCountdownIsland } from './components/ShiftCountdownIsland';
import './theme/variables.css';
import * as LiveUpdates from '@capacitor/live-updates';

async function syncLiveUpdates(): Promise<void> {
  try {
    const result = await LiveUpdates.sync();
    localStorage.shouldReloadApp = result.activeApplicationPathChanged;
  } catch {
    // Unavailable in web dev or when Live Updates is not configured for this build.
  }
}

async function initializeApp() {
  if (!Capacitor.isNativePlatform()) return;

  document.addEventListener('ion:resume', async () => {
    if (localStorage.shouldReloadApp === 'true') {
      try {
        await LiveUpdates.reload();
      } catch {
        localStorage.shouldReloadApp = 'false';
      }
      return;
    }
    await syncLiveUpdates();
  });

  await syncLiveUpdates();
}

void (async () => {
  await initializeApp();

  await defineCustomElements(window);

  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();