import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut, Settings, ShieldCheck, User } from 'lucide-react';

const UserMenu = ({ user, onLogout, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleEsc = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const handleNavigate = (path) => {
    onNavigate(path);
    setOpen(false);
  };

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-chip" onClick={() => setOpen((prev) => !prev)}>
        <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
        <div className="chip-meta">
          <span className="chip-name">{user?.username}</span>
          <span className="chip-role">{user?.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}</span>
        </div>
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="user-dropdown">
          <button className="dropdown-item" onClick={() => handleNavigate('/mi-perfil')}>
            <User size={16} /> Mi perfil
          </button>
          <button className="dropdown-item" onClick={() => handleNavigate('/mi-perfil?tab=seguridad')}>
            <ShieldCheck size={16} /> Cambiar contraseña
          </button>
          {user?.role === 'ADMIN' && (
            <button className="dropdown-item" onClick={() => handleNavigate('/configuracion')}>
              <Settings size={16} /> Configuración
            </button>
          )}
          <div className="dropdown-separator" />
          <button className="dropdown-item danger" onClick={onLogout}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
