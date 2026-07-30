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

function NavItem({ to, label, Icon, mostrarLabel, onNavClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      title={!mostrarLabel ? label : undefined}
      onClick={onNavClick}
    >
      <span className="nav-icon" aria-hidden="true"><Icon /></span>
      {mostrarLabel && <span className="nav-label">{label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ movilAbierta = false, onCerrarMovil }) {
  const [colapsada, setColapsada] = useState(() => {
    const saved = loadJSON(COLAPSADO_KEY, null);
    // Si no hay preferencia guardada, colapsar automáticamente en tablet/móvil
    return saved !== null ? saved : window.innerWidth <= 1024;
  });

  function alternarColapso() {
    setColapsada((prev) => {
      const nuevo = !prev;
      saveJSON(COLAPSADO_KEY, nuevo);
      return nuevo;
    });
  }

  // En móvil con cajón abierto, siempre mostramos las etiquetas
  const mostrarLabels = movilAbierta || !colapsada;

  return (
    <aside className={[
      'sidebar',
      colapsada ? 'colapsada' : '',
      movilAbierta ? 'sidebar-movil-abierta' : '',
    ].filter(Boolean).join(' ')}>
      <div className="sidebar-header">
        {mostrarLabels && <div className="sidebar-title">Suite de Oficina</div>}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={movilAbierta ? onCerrarMovil : alternarColapso}
          title={colapsada && !movilAbierta ? 'Expandir menú' : 'Colapsar menú'}
        >
          {colapsada && !movilAbierta ? <IconColapsarDerecha /> : <IconColapsarIzquierda />}
        </button>
      </div>
      <nav>
        <NavItem to="/" label="Inicio" Icon={IconInicio} mostrarLabel={mostrarLabels} onNavClick={onCerrarMovil} />
        {SECTIONS.map((section) => (
          <SectionNavItem key={section.key} section={section} mostrarLabel={mostrarLabels} onNavClick={onCerrarMovil} />
        ))}
        <div className="nav-separator" />
        <NavItem to="/admin" label="Administración" Icon={IconAdmin} mostrarLabel={mostrarLabels} onNavClick={onCerrarMovil} />
      </nav>
    </aside>
  );
}

function SectionNavItem({ section, mostrarLabel, onNavClick }) {
  const puedeVer = usePermission(section.key, 'view');
  if (!puedeVer) return null;
  return (
    <NavItem
      to={ROUTES_BY_SECTION[section.key]}
      label={section.label}
      Icon={ICONOS_POR_SECCION[section.key] || IconReportes}
      mostrarLabel={mostrarLabel}
      onNavClick={onNavClick}
    />
  );
}
