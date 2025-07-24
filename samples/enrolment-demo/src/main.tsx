// Package Imports
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Local Imports
import './main.css';
import { Layout } from './components/Layout';
import { Demo } from './pages/Demo';
import { Home } from './pages/Home';
import { StoreProvider } from './common/stores';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Layout>
          <Routes>
            <Route path="/home" element={<Home />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="*" element={<Navigate to="/home" />} />
          </Routes>
        </Layout>
      </StoreProvider>
    </BrowserRouter>
  </StrictMode>,
);
