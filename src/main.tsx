import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { ContentProvider } from './context/ContentContext';
import { AuthProvider } from './context/AuthContext';
import { PluginsProvider } from './context/PluginsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PluginsProvider>
          <ContentProvider>
            <App />
          </ContentProvider>
        </PluginsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
