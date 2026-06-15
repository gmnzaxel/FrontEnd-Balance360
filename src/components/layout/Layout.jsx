import React, { Suspense, useMemo, useState, useContext, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import UserMenu from './UserMenu';
import { AuthContext } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const Layout = () => {
  const { user, logout, effectiveRole, isAdmin } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 1024px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1024px)');
    const handler = (e) => setIsMobile(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = useMemo(() => {
    const items = [
      { path: '/products', label: 'Inventario' },
      { path: '/sales', label: 'Ventas' },
      { path: '/quotes', label: 'Presupuestos' },
      { path: '/new-sale', label: 'Punto de Venta' },
    ];

    if (isAdmin) {
      items.unshift({ path: '/dashboard', label: 'Dashboard' });
      items.splice(3, 0, { path: '/reports', label: 'Reportes' });
      items.push({ path: '/users', label: 'Usuarios' });
    }

    if (user?.is_superuser) {
      items.unshift({ path: '/super-dashboard', label: 'Panel SuperAdmin' });
    }

    return items;
  }, [isAdmin, user]);

  const pageTitle = useMemo(() => {
    const current = navItems.find((item) => item.path === location.pathname);
    if (current) return current.label;
    if (location.pathname === '/mi-perfil') return 'Mi Perfil';
    if (location.pathname === '/configuracion') return 'Configuración';
    if (location.pathname === '/super-dashboard') return 'Panel SuperAdmin';
    return 'Balance360';
  }, [location.pathname, navItems]);

  const handleNavigate = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handleGlobalKeys = (e) => {
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const key = e.key;
        const index = parseInt(key, 10) - 1;
        if (index >= 0 && index < navItems.length) {
          e.preventDefault();
          handleNavigate(navItems[index].path);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [navItems]);

  const effectiveUser = user ? { ...user, role: effectiveRole || user.role } : user;

  return (
    <div className="app-shell">
      <Sidebar
        navItems={navItems}
        activePath={location.pathname}
        user={effectiveUser}
        mobileOpen={sidebarOpen}
        isMobile={isMobile}
        onNavigate={handleNavigate}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div className="app-main">
        <Header
          title={pageTitle}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          menuSlot={(
            <UserMenu
              user={effectiveUser}
              onLogout={logout}
              onNavigate={handleNavigate}
            />
          )}
        />

        {user?.is_superuser && localStorage.getItem('impersonated_company_id') && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(251, 191, 36, 0.08) 100%)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#f59e0b',
                boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.2)',
                animation: 'pulseDot 2s infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.875rem', color: '#d97706', fontWeight: '600', lineHeight: 1.4 }}>
                Modo auditoría activo:{' '}
                <strong style={{ color: '#f59e0b' }}>
                  {localStorage.getItem('impersonated_company_name') || 'Empresa seleccionada'}
                </strong>
                <span style={{ fontWeight: '400', color: '#9ca3af', marginLeft: '6px' }}>
                  — Los cambios que realices afectan a esta empresa.
                </span>
              </span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('impersonated_company_id');
                localStorage.removeItem('impersonated_company_name');
                navigate('/super-dashboard');
              }}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#d97706',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '0.8rem',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(245, 158, 11, 0.25)';
                e.target.style.borderColor = 'rgba(245, 158, 11, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(245, 158, 11, 0.15)';
                e.target.style.borderColor = 'rgba(245, 158, 11, 0.3)';
              }}
            >
              ← Salir de empresa
            </button>
          </div>
        )}

        <main className="app-content">
          <Suspense fallback={
            <div className="page-fallback">
              <Loader2 className="spin" size={28} />
              <p>Cargando módulo...</p>
            </div>
          }>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
