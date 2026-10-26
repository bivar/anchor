import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/caprasimo/latin-400.css';
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import App from './App';
import { installGlobalErrorHandlers } from './platform/errorLog';
import { captureInstallPrompt } from './platform/install';
import { registerServiceWorker } from './platform/serviceWorker';
import { loadRaw } from './platform/storage';
import { applyTheme } from './platform/theme';
import { hydrateState } from './state/store';
import './styles/organic.css';
import './styles/app.css';

installGlobalErrorHandlers();
captureInstallPrompt();
registerServiceWorker();

const initial = hydrateState(loadRaw());
// Apply the saved theme before the first paint to avoid a light flash in dark mode.
applyTheme(initial.theme);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App initial={initial} />
  </React.StrictMode>,
);
