import React, { useContext, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
    LayoutDashboard, Package, ShoppingCart, FileText,
    LogOut, PlusCircle, User, Menu, X, Settings
} from 'lucide-react';

const Layout = () => {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const navItems = [
        { path: '/products', label: 'Inventario', icon: <Package size={20} /> },
        { path: '/sales', label: 'Ventas', icon: <ShoppingCart size={20} /> },
        { path: '/new-sale', label: 'Punto de Venta', icon: <PlusCircle size={20} /> },
        { path: '/mi-perfil', label: 'Mi Perfil', icon: <User size={20} /> },
    ];

    // Add Admin only items at the beginning or specific positions
    if (user?.role === 'ADMIN') {
        navItems.unshift({ path: '/', label: 'Overview', icon: <LayoutDashboard size={20} /> });
        navItems.splice(4, 0, { path: '/reports', label: 'Reportes', icon: <FileText size={20} /> });
        navItems.push({ path: '/users', label: 'Usuarios', icon: <User size={20} /> });
        navItems.push({ path: '/configuracion', label: 'Configuración', icon: <Settings size={20} /> });
    }

    const getPageTitle = () => {
        const item = navItems.find(i => i.path === location.pathname);
        return item ? item.label : 'Balance360';
    };

    return (
        <div className="layout">
            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="mobile-overlay"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="logo">
                    <span style={{ flex: 1 }}>Balance<span>360</span></span>
                    {/* Close button for mobile inside sidebar */}
                    <button
                        className="mobile-toggle"
                        onClick={() => setMobileOpen(false)}
                        style={{ marginLeft: 'auto', color: 'white' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="nav-menu">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)} // Close on navigate
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="logout-container">
                    <button onClick={logout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            <div className="main-wrapper">
                <header className="topbar">
                    <div className="flex-center" style={{ gap: '1rem' }}>
                        <button
                            className="mobile-toggle"
                            onClick={() => setMobileOpen(!mobileOpen)}
                        >
                            <Menu size={24} />
                        </button>
                        <h2 className="page-title">{getPageTitle()}</h2>
                    </div>

                    <div className="user-profile">
                        <div className="avatar">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-bold">{user?.username || 'Usuario'}</span>
                    </div>
                </header>

                <main className="scrollalbe-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default Layout;
