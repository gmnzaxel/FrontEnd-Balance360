import React, { useEffect, useRef, useState, useContext } from 'react';
import { ChevronDown, LogOut, Settings, User, Sun, Moon } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const UserMenu = ({ user, onLogout, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { isAdminActual } = useContext(AuthContext);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
          {isAdminActual && (
            <button className="dropdown-item" onClick={() => handleNavigate('/configuracion')}>
              <Settings size={16} /> Configuración
            </button>
          )}
          <button className="dropdown-item" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </button>
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
