import React from 'react';
import { NavLink } from 'react-router-dom';
import { SECTIONS } from '../data/permissionsSchema.js';
import { usePermission } from '../context/PermissionsContext.jsx';

const ROUTES_BY_SECTION = {
  orderApproval: '/order-approval',
  tracking: '/tracking',
};

function NavItem({ to, label }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-title">Suite de Oficina</div>
      <nav>
        <NavItem to="/" label="Inicio" />
        {SECTIONS.map((section) => (
          <SectionNavItem key={section.key} section={section} />
        ))}
        <div className="nav-separator" />
        <NavItem to="/admin" label="Administración" />
      </nav>
    </aside>
  );
}

function SectionNavItem({ section }) {
  const puedeVer = usePermission(section.key, 'view');
  if (!puedeVer) return null;
  return <NavItem to={ROUTES_BY_SECTION[section.key]} label={section.label} />;
}
