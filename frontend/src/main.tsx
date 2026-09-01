// @ts-nocheck
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRouter } from './app/AppRouter.jsx';
import { createApplicationDependencies } from './app/compositionRoot.js';
import './styles.css';
const dependencies = createApplicationDependencies();
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter dependencies={dependencies} />
  </React.StrictMode>
);
