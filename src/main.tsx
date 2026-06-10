import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// CHANGE: Add the following import
import { defineCustomElements } from '@ionic/pwa-elements/loader';
import { ShiftCountdownIsland } from './components/ShiftCountdownIsland';
import './theme/variables.css';
    // CHANGE: Call the element loader before the render call
defineCustomElements(window);

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
<ShiftCountdownIsland />
    <App />
  </React.StrictMode>
);