import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  FileText,
  Briefcase,
  Store,
  Settings,
  Zap,
  X,
  LifeBuoy,
  Mail,
  MessageCircle,
  Calculator
} from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import Modal from '../ui/Modal';

const ICONS = {
  '/dashboard': <LayoutDashboard size={20} />,
  '/products': <Package size={20} />,
  '/sales': <ShoppingCart size={20} />,
  '/quotes': <Calculator size={20} />,
  '/new-sale': <Store size={20} />,
  '/reports': <FileText size={20} />,
  '/users': <Briefcase size={20} />,
  '/configuracion': <Settings size={20} />,
};

const Sidebar = ({ navItems, activePath, user, mobileOpen, isMobile, onNavigate, onCloseMobile }) => {
  const [hovering, setHovering] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const sidebarRef = useRef(null);

  const handleBrandKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onNavigate('/');
    }
  };

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        onCloseMobile();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileOpen, onCloseMobile]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    return () => document.body.classList.remove('no-scroll');
  }, [mobileOpen]);

  const roleLabel = useMemo(
    () => (user?.role === 'ADMIN' ? 'Administrador' : 'Vendedor'),
    [user?.role]
  );
  const isAdmin = user?.role === 'ADMIN';

  const showLabels = (hovering && !isMobile) || isMobile;

  const handleNavClick = (path) => {
    if (path === 'support') {
      setShowSupportModal(true);
      return;
    }
    onNavigate(path);
    if (isMobile) onCloseMobile();
  };

  const quickActions = useMemo(() => {
    const actions = [
      ...(isAdmin ? [{ label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={16} /> }] : []),
      { label: 'Inventario', path: '/products', icon: <Package size={16} /> },
      { label: 'Ventas', path: '/sales', icon: <ShoppingCart size={16} /> },
      { label: 'Presupuestos', path: '/quotes', icon: <Calculator size={16} /> },
      { label: 'Nueva venta', path: '/new-sale', icon: <Zap size={16} /> },
      ...(isAdmin ? [{ label: 'Reportes', path: '/reports', icon: <FileText size={16} /> }] : []),
    ];
    return actions;
  }, [isAdmin]);

  const secondaryActions = useMemo(() => {
    const actions = [
      ...(isAdmin ? [{ label: 'Usuarios', path: '/users', icon: <Briefcase size={16} /> }] : []),
      ...(isAdmin ? [{ label: 'Ajustes', path: '/configuracion', icon: <Settings size={16} /> }] : []),
      { label: 'Soporte', path: 'support', icon: <LifeBuoy size={16} /> },
    ];
    return actions;
  }, [isAdmin]);

  const navItemsFiltered = useMemo(
    () => navItems.filter((item) => item.path !== '/dashboard'),
    [navItems]
  );

  return (
    <>
      {isMobile && mobileOpen && <div className="drawer-overlay" onClick={onCloseMobile} />}

      <aside
        ref={sidebarRef}
        className={`sidebar ${mobileOpen ? 'open' : ''} ${hovering ? 'expanded' : ''} ${isMobile ? 'mobile-mode' : ''}`}
        onMouseEnter={() => !isMobile && setHovering(true)}
        onMouseLeave={() => !isMobile && setHovering(false)}
      >
        <div className="sidebar-inner">
          <div
            className="sidebar-brand"
            onClick={() => onNavigate('/')}
            role="button"
            tabIndex={0}
            onKeyDown={handleBrandKey}
          >
            <div className="brand-icon">
              <BrandMark size={22} />
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

          {showLabels && (
            <div className="sidebar-extras">
              <div className="sidebar-section">
                <p className="sidebar-section-title">Acciones rapidas</p>
                <div className="sidebar-actions">
                  {quickActions.map((action, index) => (
                    <button
                      key={action.label}
                      className="sidebar-action"
                      onClick={() => handleNavClick(action.path)}
                      style={{ '--delay': `${index * 70}ms` }}
                    >
                      <span className="sidebar-action-icon">{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!showLabels && (
            <div className="sidebar-quick-compact" aria-label="Acciones rápidas">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  className="sidebar-action-compact"
                  onClick={() => handleNavClick(action.path)}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}

          {showLabels && (
            <div className="sidebar-extras" style={{ paddingTop: '0', paddingBottom: '4px' }}>
              <div className="sidebar-section">
                <p className="sidebar-section-title">Sistema</p>
                <div className="sidebar-actions">
                  {secondaryActions.map((action, index) => (
                    <button
                      key={action.label}
                      className="sidebar-action"
                      onClick={() => handleNavClick(action.path)}
                      style={{ '--delay': `${index * 70}ms` }}
                    >
                      <span className="sidebar-action-icon">{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!showLabels && (
            <div className="sidebar-quick-compact" aria-label="Sistema" style={{ paddingTop: '0', paddingBottom: '0' }}>
              {secondaryActions.map((action) => (
                <button
                  key={action.label}
                  className="sidebar-action-compact"
                  onClick={() => handleNavClick(action.path)}
                  title={action.label}
                  aria-label={action.label}
                >
                  {action.icon}
                </button>
              ))}
            </div>
          )}

          <div className="sidebar-spacer" />

          {showLabels && !isMobile && (
            <div className="sidebar-profile">
              <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'U'}</div>
              <div className="user-meta">
                <p className="user-name">{user?.username || 'Usuario'}</p>
                <p className="user-role">{roleLabel}</p>
                <div className="user-status">
                  <span className="status-dot" />
                  <span>Online</span>
                </div>
              </div>
            </div>
          )}

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

      {showSupportModal && (
        <Modal title="Soporte Técnico" onClose={() => setShowSupportModal(false)} size="md">
          <div className="stack gap-md text-center">
            <div className="muted mb-4">
              ¿Tienes algún problema o necesitas ayuda con el sistema? Puedes contactarnos a través de los siguientes canales:
            </div>

            <a
              href="mailto:gimenezaaxel@gmail.com"
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
            >
              <Mail size={18} /> gimenezaaxel@gmail.com
            </a>

            <a
              href="https://wa.me/5492604845564"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderColor: '#25D366', color: '#25D366' }}
            >
              <MessageCircle size={18} /> WhatsApp: 2604845564
            </a>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
