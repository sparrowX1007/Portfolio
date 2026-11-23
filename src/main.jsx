import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';
import './admin/admin.css';

function Root() {
  const location = useLocation();
  return location.pathname.startsWith('/admin') ? <AdminApp /> : <App />;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><BrowserRouter><Root /></BrowserRouter></React.StrictMode>);
