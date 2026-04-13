import React from 'react';
import ReactDOM from 'react-dom/client';
import 'tldraw/tldraw.css';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

import './i18n';
import './styles/app.css';
import { App } from './App';
import { RenderErrorBoundary } from './components/system/RenderErrorBoundary';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RenderErrorBoundary>
      <App />
    </RenderErrorBoundary>
  </React.StrictMode>,
);
