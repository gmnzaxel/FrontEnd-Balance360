import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnly from './components/AdminOnly';
import Layout from './components/layout/Layout';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Sales = lazy(() => import('./pages/Sales'));
const NewSale = lazy(() => import('./pages/NewSale'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

const SuspenseFallback = <div className="page-fallback">Cargando módulo...</div>;

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={SuspenseFallback}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<AdminOnly><Dashboard /></AdminOnly>} />
                <Route path="/products" element={<Products />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/new-sale" element={<NewSale />} />
                <Route path="/reports" element={<AdminOnly><Reports /></AdminOnly>} />
                <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
                <Route path="/mi-perfil" element={<Profile />} />
                <Route path="/configuracion" element={<AdminOnly><Settings /></AdminOnly>} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <ToastContainer position="bottom-right" />
    </AuthProvider>
  );
}

export default App;
