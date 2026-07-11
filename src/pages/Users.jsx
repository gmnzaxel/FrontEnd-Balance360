import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Trash2, Edit, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';
import Modal from '../components/ui/Modal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

const Users = () => {
    const { user: currentUser, isAdmin } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        role: 'USER',
        is_active: true
    });
    const [confirmConfig, setConfirmConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmLabel: '',
        variant: 'danger',
        onConfirm: null
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('users/');
            const list = response.data.results || response.data;
            setUsers(Array.isArray(list) ? list : []);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error));
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return <div className="p-8 text-center text-muted">No tienes permisos para ver esta página.</div>;
    }

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
            if (editingUser) {
                await api.patch(`users/${editingUser.id}/`, formData);
                toast.success("Usuario actualizado");
            } else {
                await api.post('users/', formData);
                toast.success("Usuario creado");
            }
            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    };

    const performToggleStatus = async (user, newStatus) => {
        try {
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            await api.patch(`users/${user.id}/`, { is_active: newStatus });
            toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error));
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: user.is_active } : u));
        }
    };

    const handleToggleStatus = (user) => {
        if (user.id === currentUser?.user_id) {
            toast.error('No puedes desactivarte a ti mismo.');
            return;
        }
        const newStatus = !user.is_active;
        if (!newStatus) {
            setConfirmConfig({
                isOpen: true,
                title: 'Desactivar usuario',
                message: `¿Seguro que deseas desactivar a ${user.username}?`,
                confirmLabel: 'Desactivar',
                variant: 'warning',
                onConfirm: () => {
                    setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    performToggleStatus(user, newStatus);
                }
            });
        } else {
            performToggleStatus(user, newStatus);
        }
    };

    const handleDelete = (id) => {
        if (id === currentUser?.user_id) {
            toast.error('No puedes eliminar tu propio usuario.');
            return;
        }
        setConfirmConfig({
            isOpen: true,
            title: 'Eliminar usuario',
            message: '¿Seguro que desea eliminar este usuario?',
            confirmLabel: 'Eliminar',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                try {
                    await api.delete(`users/${id}/`);
                    toast.success("Usuario eliminado");
                    fetchUsers();
                } catch (error) {
                    console.error(error);
                    toast.error(getErrorMessage(error));
                }
            }
        });
    };

    const handleEdit = (u) => {
        setEditingUser(u);
        setFormData({
            username: u.username,
            password: '', // Password is not shown
            email: u.email,
            role: u.role,
            is_active: u.is_active
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ username: '', password: '', email: '', role: 'USER', is_active: true });
    };

    return (
        <div className="users-page page">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Administración</p>
                    <h2 className="page-heading">Usuarios</h2>
                    <p className="page-subtitle">Administrá el acceso y los roles del sistema.</p>
                </div>
                <div className="page-header-actions">
                    <Button variant="primary" icon={<Plus size={18} />} onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}>
                        Nuevo usuario
                    </Button>
                </div>
            </div>

            <div className="card users-table-card">
                <div className="table-container shadow-sm">
                    <table className="styled-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Email</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th style={{ textAlign: 'center', width: '100px', verticalAlign: 'middle' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td className="font-medium" data-label="Usuario">{u.username}</td>
                                    <td data-label="Email">{u.email}</td>
                                    <td data-label="Rol">
                                        <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="toggle-cell" data-label="Estado">
                                        <div className="toggle-wrap">
                                            <label className="toggle-switch transform scale-75 origin-left">
                                                <input
                                                    type="checkbox"
                                                    checked={u.is_active}
                                                    disabled={u.id === currentUser?.user_id}
                                                    onChange={() => handleToggleStatus(u)}
                                                />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }} data-label="Acciones">
                                        <div className="flex justify-center gap-1">
                                            <button className="btn-icon" onClick={() => handleEdit(u)} title="Editar">
                                                <Edit size={18} />
                                            </button>
                                            <button
                                                className="btn-icon danger"
                                                onClick={() => handleDelete(u.id)}
                                                title="Eliminar"
                                                disabled={u.id === currentUser?.user_id}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {loading && (
                                <tr>
                                    <td colSpan="5" className="text-center p-8 text-muted">Cargando usuarios...</td>
                                </tr>
                            )}
                            {users.length === 0 && !loading && (
                                <tr><td colSpan="5" className="text-center p-8 text-muted">Todavía no hay usuarios creados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <Modal
                    title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                    onClose={() => !submitting && setShowModal(false)}
                    size="md"
                >
                    <form onSubmit={handleSubmit} className="form-stack">
                        <Input
                            label="Nombre de Usuario"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={!!editingUser}
                            placeholder="Ej. jperez"
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Ej. juan@empresa.com"
                        />
                        {!editingUser && (
                            <Input
                                label="Contraseña"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                placeholder="••••••••"
                            />
                        )}
                        <Select
                            label="Rol de Acceso"
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={editingUser?.id === currentUser?.user_id}
                        >
                            <option value="USER">Usuario (Vendedor)</option>
                            <option value="ADMIN">Administrador</option>
                        </Select>

                        <div className="modal-actions mt-6">
                            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} disabled={submitting}>
                                Cancelar
                            </Button>
                            <Button type="submit" variant="primary" loading={submitting}>
                                Guardar usuario
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                confirmLabel={confirmConfig.confirmLabel}
                variant={confirmConfig.variant}
                onConfirm={confirmConfig.onConfirm}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default Users;
