import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { usePermissionsContext } from '../context/PermissionsContext.jsx';

export default function AppLayout() {
  const { currentUser } = usePermissionsContext();

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-content">
        <header className="app-header">
          <span>Sesión de trabajo (sin login todavía)</span>
          <strong>{currentUser?.nombre}</strong>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
