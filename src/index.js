import React from 'react';
import { createRoot } from "react-dom/client";
import './index.css';
// ⚠️ Imported for its side effect, before React mounts: the hook stamps <html> with the
// reader's glitch setting at import time, so someone who turned the animations off never
// sees the first frame of them. An effect would run after the first paint.
import './hooks/useGlitchIntensity';
import App from './App';
import { BrowserRouter as Router } from 'react-router-dom';

const root = createRoot(document.getElementById("root"));
root.render(
  <Router>
    <App />
  </Router>
);
