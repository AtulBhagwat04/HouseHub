import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Self-hosted variable fonts. Bundled rather than loaded from a CDN so the app
// has no third-party request on first paint and works offline in development.
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';

import App from './App';
import './index.css';

/**
 * Entry point.
 *
 * Provider order matters and is easiest to read in App.jsx - the router lives
 * here so `<Link>` works in every provider below it.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
