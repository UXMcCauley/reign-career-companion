import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// CHANGE: Add the following import
import { defineCustomElements } from '@ionic/pwa-elements/loader';
// import { ShiftCountdownIsland } from './components/ShiftCountdownIsland';
import './theme/variables.css';
import * as LiveUpdates from '@capacitor/live-updates'; 

async function initializeApp() {
  // Register event to fire each time user resumes the app  
  document.addEventListener('ion:resume', async () => {
    if (localStorage.shouldReloadApp === 'true') {
      await LiveUpdates.reload();
    }
    else {
      const result = await LiveUpdates.sync();
      localStorage.shouldReloadApp = result.activeApplicationPathChanged;
    }
  });
  // First sync on app load
  const result = await LiveUpdates.sync();
  localStorage.shouldReloadApp = result.activeApplicationPathChanged;
}

void (async () => {
  try {
    await initializeApp();
  } catch (error) {
    console.error('LiveUpdates init failed:', error);
  }

  await defineCustomElements(window);

  const container = document.getElementById('root');
  const root = createRoot(container!);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
})();