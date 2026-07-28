import React, { useState } from 'react';
import Card from '../../components/Card.jsx';
import { SECTIONS, ROLES } from '../../data/permissionsSchema.js';
import { usePermissionsContext } from '../../context/PermissionsContext.jsx';

export default function AdminUsersPage() {
  const { users, addUser, updateUser, removeUser, setPermission } = usePermissionsContext();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rol, setRol] = useState('user');

  function handleCrear(e) {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) return;
    addUser({ nombre: nombre.trim(), email: email.trim(), rol });
    setNombre('');
    setEmail('');
    setRol('user');
  }

  return (
    <>
      <div className="warning-box">
        Todavía no hay pantalla de inicio de sesión: esta pantalla deja preparada la
        estructura de usuarios, roles y permisos por sección/acción para cuando se
        active el login real. Por ahora la app funciona como si el Administrador
        estuviera siempre conectado.
      </div>

      <Card title="Crear usuario">
        <form onSubmit={handleCrear} className="field-row">
          <div className="field">
            <label>Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Rol</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button className="primary" type="submit">Agregar usuario</button>
        </form>
      </Card>

      {users.map((user) => (
        <UserPermissionsCard
          key={user.id}
          user={user}
          onUpdateUser={updateUser}
          onRemoveUser={removeUser}
          onSetPermission={setPermission}
        />
      ))}
    </>
  );
}

function UserPermissionsCard({ user, onUpdateUser, onRemoveUser, onSetPermission }) {
  const esAdmin = user.rol === 'admin';

  return (
    <Card
      title={`${user.nombre} (${user.email})`}
      actions={
        <>
          <select
            value={user.rol}
            onChange={(e) => onUpdateUser(user.id, { rol: e.target.value })}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="checkbox"
              checked={user.activo}
              onChange={(e) => onUpdateUser(user.id, { activo: e.target.checked })}
            />
            Activo
          </label>
          {user.id !== 'admin' && (
            <button className="danger" onClick={() => onRemoveUser(user.id)}>
              Eliminar
            </button>
          )}
        </>
      }
    >
      {esAdmin ? (
        <p className="hint">Los administradores tienen acceso completo a todas las secciones.</p>
      ) : (
        SECTIONS.map((section) => (
          <div key={section.key} style={{ marginBottom: 12 }}>
            <strong style={{ fontSize: 13 }}>{section.label}</strong>
            <div className="permissions-grid">
              {section.actions.map((action) => (
                <label key={action.key}>
                  <input
                    type="checkbox"
                    checked={Boolean(user.permisos?.[section.key]?.[action.key])}
                    onChange={(e) =>
                      onSetPermission(user.id, section.key, action.key, e.target.checked)
                    }
                  />
                  {action.label}
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
