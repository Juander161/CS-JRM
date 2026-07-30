import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import { usePermissionsContext } from '../context/PermissionsContext.jsx';

export default function AppLayout() {
  const { currentUser } = usePermissionsContext();
  const [movilMenuAbierto, setMovilMenuAbierto] = useState(false);

  return (
    <div className="app-shell">
      {movilMenuAbierto && (
        <div className="sidebar-overlay" onClick={() => setMovilMenuAbierto(false)} />
      )}
      <Sidebar
        movilAbierta={movilMenuAbierto}
        onCerrarMovil={() => setMovilMenuAbierto(false)}
      />
      <div className="app-content">
        <header className="app-header">
          <button
            type="button"
            className="menu-hamburguesa"
            onClick={() => setMovilMenuAbierto(true)}
            title="Abrir menú"
          >
            ☰
          </button>
          <span className="header-info">Sesión de trabajo (sin login todavía)</span>
          <strong>{currentUser?.nombre}</strong>
        </header>
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
