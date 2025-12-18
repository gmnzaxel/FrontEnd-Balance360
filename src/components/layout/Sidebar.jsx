import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Briefcase,
  Store,
  Settings,
  X
} from 'lucide-react';

const ICONS = {
  '/': <LayoutDashboard size={20} />,
  '/products': <Package size={20} />,
  '/sales': <ShoppingCart size={20} />,
  '/new-sale': <Store size={20} />,
  '/reports': <FileText size={20} />,
  '/users': <Briefcase size={20} />,
  '/configuracion': <Settings size={20} />,
};

const Sidebar = ({ navItems, activePath, user, mobileOpen, isMobile, onNavigate, onCloseMobile }) => {
  const [hovering, setHovering] = useState(false);

  const handleBrandKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate('/');
    }
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [mobileOpen, onCloseMobile]);

  const roleLabel = useMemo(
    () => (user?.role === 'ADMIN' ? 'Administrador' : 'Vendedor'),
    [user?.role]
  );

  const showLabels = (hovering && !isMobile) || isMobile;

  return (
    <>
      {isMobile && mobileOpen && <div className="drawer-overlay" onClick={onCloseMobile} />}

      <aside
        className={`sidebar ${mobileOpen ? 'open' : ''} ${hovering ? 'expanded' : ''} ${isMobile ? 'mobile-mode' : ''}`}
        onMouseEnter={() => !isMobile && setHovering(true)}
        onMouseLeave={() => !isMobile && setHovering(false)}
      >
        {/* ✅ ESTA ES LA LÍNEA CLAVE: antes era "sidebar-visual" */}
        <div className="sidebar-inner">
          <div
            className="sidebar-brand"
            onClick={() => onNavigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={handleBrandKey}
          >
            <div className="brand-icon">
              <ShieldCheck size={24} />
            </div>
            <div className="brand-text">
              <span>Balance</span>
              <strong>360</strong>
            </div>
          </div>

          {isMobile && (
            <button className="ghost-icon close-btn" onClick={onCloseMobile} aria-label="Cerrar menú">
              <X size={18} />
            </button>
          )}

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.path}
                className={`nav-link ${activePath === item.path ? 'active' : ''}`}
                onClick={() => onNavigate(item.path)}
                title={item.label}
              >
                <span className="nav-icon">{ICONS[item.path] || ICONS['/']}</span>
                {showLabels && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </nav>

          {isMobile && (
            <div className="sidebar-user">
              <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
              <div className="user-meta">
                <p className="user-name">{user?.username || 'Usuario'}</p>
                <p className="user-role">{roleLabel}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
