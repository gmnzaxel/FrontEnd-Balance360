import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnly from './components/AdminOnly';
import SuperUserOnly from './components/SuperUserOnly';
import Layout from './components/layout/Layout';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));
const NewSale = lazy(() => import('./pages/NewSale'));
const Reports = lazy(() => import('./pages/Reports'));
const Quotes = lazy(() => import('./pages/Quotes'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const SuperDashboard = lazy(() => import('./pages/SuperDashboard'));

import { AuthContext } from './context/AuthContext';

const HomeRedirect = () => {
  const { user } = React.useContext(AuthContext);
  if (user?.is_superuser && !localStorage.getItem('impersonated_company_id')) {
    return <Navigate to="/super-dashboard" replace />;
  }
  return <Navigate to="/new-sale" replace />;
};

const SuspenseFallback = <div className="page-fallback">Cargando módulo...</div>;

function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={SuspenseFallback}>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/super-dashboard" element={<SuperUserOnly><SuperDashboard /></SuperUserOnly>} />
                <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
                <Route path="/products" element={<Products />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/new-sale" element={<NewSale />} />
                <Route path="/reports" element={<AdminOnly><Reports /></AdminOnly>} />
                <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
                <Route path="/mi-perfil" element={<Profile />} />
                <Route path="/configuracion" element={<AdminOnly useActualRole><Settings /></AdminOnly>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="dark"
        toastStyle={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-strong)',
          borderRadius: '14px',
          color: 'var(--text-primary)',
          fontSize: '0.9rem',
          fontWeight: '500',
          boxShadow: 'var(--shadow-md)',
          padding: '14px 16px',
        }}
      />
    </AuthProvider>
  );
}

export default App;
