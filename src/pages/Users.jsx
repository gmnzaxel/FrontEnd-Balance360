import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Trash2, Edit, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-toastify';
import { getErrorMessage } from '../utils/errorUtils';

const Users = () => {
    const { user: currentUser } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        role: 'USER',
        is_active: true
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

    if (currentUser?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-muted">No tienes permisos para ver esta página.</div>;
    }

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
        }
    };

    const handleToggleStatus = async (user) => {
        if (user.id === currentUser?.user_id) {
            toast.error('No puedes desactivarte a ti mismo.');
            return;
        }
        const newStatus = !user.is_active;
        if (!newStatus) {
            const confirmed = window.confirm(`¿Seguro que deseas desactivar a ${user.username}?`);
            if (!confirmed) return;
        }
        try {
            // Update UI optimistically
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
            await api.patch(`users/${user.id}/`, { is_active: newStatus });
            toast.success(`Usuario ${newStatus ? 'activado' : 'desactivado'}`);
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error));
            // Revert on error
            setUsers(users.map(u => u.id === user.id ? { ...u, is_active: user.is_active } : u));
        }
    };

    const handleDelete = async (id) => {
        if (id === currentUser?.user_id) {
            toast.error('No puedes eliminar tu propio usuario.');
            return;
        }
        if (window.confirm("¿Seguro que desea eliminar este usuario?")) {
            try {
                await api.delete(`users/${id}/`);
                toast.success("Usuario eliminado");
                fetchUsers();
            } catch (error) {
                console.error(error);
                toast.error(getErrorMessage(error));
            }
        }
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
                    <button className="btn btn-primary" onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}>
                    <Plus size={18} /> Nuevo usuario
                    </button>
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
                                    <td className="font-medium text-slate-800" data-label="Usuario">{u.username}</td>
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
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Nombre de Usuario</label>
                                <input
                                    className="input-control"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    disabled={!!editingUser}
                                    placeholder="Ej. jperez"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    className="input-control"
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Ej. juan@empresa.com"
                                />
                            </div>
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Contraseña</label>
                                    <input
                                        className="input-control"
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        placeholder="••••••••"
                                    />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Rol de Acceso</label>
                                <select
                                    className="select-control"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    disabled={editingUser?.id === currentUser?.user_id}
                                >
                                    <option value="USER">Usuario (Vendedor)</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>

                            <div className="modal-actions mt-6">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar usuario</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
