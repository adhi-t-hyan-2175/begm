import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Automatically reload the page if a dynamically imported module fails to load.
// This typically happens when a new version of the site is deployed, and the
// client's browser has cached an old index.html with outdated JS chunk hashes.
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Vite preload error, automatically reloading the page...');
  window.location.reload();
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
