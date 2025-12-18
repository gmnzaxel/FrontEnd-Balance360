import React, { useContext } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, Package, ShoppingCart, FileText, LogOut, PlusCircle } from 'lucide-react';

const Layout = () => {
    const { logout, user } = useContext(AuthContext);
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { path: '/products', label: 'Productos', icon: <Package size={20} /> },
        { path: '/sales', label: 'Ventas', icon: <ShoppingCart size={20} /> },
        { path: '/new-sale', label: 'Nueva Venta', icon: <PlusCircle size={20} /> },
        { path: '/reports', label: 'Reportes', icon: <FileText size={20} /> },
    ];

    return (
        <div className="layout">
            <aside className="sidebar">
                <div className="logo">Balance360</div>
                <nav>
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
                <button onClick={logout} className="logout-btn">
                    <LogOut size={20} />
                    <span>Salir</span>
                </button>
            </aside>
            <main className="content">
                <header className="topbar">
                    <h2>{navItems.find(i => i.path === location.pathname)?.label || 'Balance360'}</h2>
                    <div className="user-info">Hola, {user?.username || 'Usuario'}</div>
                </header>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
