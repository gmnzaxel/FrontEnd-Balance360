import React, { Suspense, useMemo, useState, useContext, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import UserMenu from './UserMenu';
import { AuthContext } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 768px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
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
      { path: '/new-sale', label: 'Punto de Venta' },
    ];

    if (user?.role === 'ADMIN') {
      items.unshift({ path: '/', label: 'Dashboard' });
      items.splice(3, 0, { path: '/reports', label: 'Reportes' });
      items.push({ path: '/users', label: 'Usuarios' });
    }

    return items;
  }, [user]);

  const pageTitle = useMemo(() => {
    const current = navItems.find((item) => item.path === location.pathname);
    if (current) return current.label;
    if (location.pathname === '/mi-perfil') return 'Mi Perfil';
    if (location.pathname === '/configuracion') return 'Configuración';
    return 'Balance360';
  }, [location.pathname, navItems]);

  const handleNavigate = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar
        navItems={navItems}
        activePath={location.pathname}
        user={user}
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
              user={user}
              onLogout={logout}
              onNavigate={handleNavigate}
            />
          )}
        />

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
