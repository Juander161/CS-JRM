import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { SECTIONS } from '../data/permissionsSchema.js';
import { usePermission } from '../context/PermissionsContext.jsx';
import { loadJSON, saveJSON } from '../services/storage/localStore.js';
import {
  IconInicio,
  IconOrderApproval,
  IconTracking,
  IconReportes,
  IconAdmin,
  IconColapsarIzquierda,
  IconColapsarDerecha,
} from './icons.jsx';

const COLAPSADO_KEY = 'sidebar-colapsada';

const ROUTES_BY_SECTION = {
  orderApproval: '/order-approval',
  tracking: '/tracking',
  reportes: '/reportes',
};

const ICONOS_POR_SECCION = {
  orderApproval: IconOrderApproval,
  tracking: IconTracking,
  reportes: IconReportes,
};

function NavItem({ to, label, Icon, colapsada }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      title={colapsada ? label : undefined}
    >
      <span className="nav-icon" aria-hidden="true"><Icon /></span>
      {!colapsada && <span className="nav-label">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const [colapsada, setColapsada] = useState(() => loadJSON(COLAPSADO_KEY, false));

  function alternarColapso() {
    setColapsada((prev) => {
      const nuevo = !prev;
      saveJSON(COLAPSADO_KEY, nuevo);
      return nuevo;
    });
  }

  return (
    <aside className={`sidebar${colapsada ? ' colapsada' : ''}`}>
      <div className="sidebar-header">
        {!colapsada && <div className="sidebar-title">Suite de Oficina</div>}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={alternarColapso}
          title={colapsada ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsada ? <IconColapsarDerecha /> : <IconColapsarIzquierda />}
        </button>
      </div>
      <nav>
        <NavItem to="/" label="Inicio" Icon={IconInicio} colapsada={colapsada} />
        {SECTIONS.map((section) => (
          <SectionNavItem key={section.key} section={section} colapsada={colapsada} />
        ))}
        <div className="nav-separator" />
        <NavItem to="/admin" label="Administración" Icon={IconAdmin} colapsada={colapsada} />
      </nav>
    </aside>
  );
}

function SectionNavItem({ section, colapsada }) {
  const puedeVer = usePermission(section.key, 'view');
  if (!puedeVer) return null;
  return (
    <NavItem
      to={ROUTES_BY_SECTION[section.key]}
      label={section.label}
      Icon={ICONOS_POR_SECCION[section.key] || IconReportes}
      colapsada={colapsada}
    />
  );
}
