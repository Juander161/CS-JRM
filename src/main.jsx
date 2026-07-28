import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { PermissionsProvider } from './context/PermissionsContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <PermissionsProvider>
        <App />
      </PermissionsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
