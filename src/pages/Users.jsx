import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Trash2, Edit, Plus, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-toastify';

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
            const response = await api.get('users/users/');
            setUsers(response.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar usuarios");
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
                await api.patch(`users/users/${editingUser.id}/`, formData);
                toast.success("Usuario actualizado");
            } else {
                await api.post('users/users/', formData);
                toast.success("Usuario creado");
            }
            setShowModal(false);
            setEditingUser(null);
            fetchUsers();
            resetForm();
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar usuario");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Seguro que desea eliminar este usuario?")) {
            try {
                await api.delete(`users/users/${id}/`);
                toast.success("Usuario eliminado");
                fetchUsers();
            } catch (error) {
                console.error(error);
                toast.error("Error al eliminar");
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
        <div className="users-page">
            <div className="card mb-6 flex-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Gestión de Usuarios</h2>
                    <p className="text-sm text-slate-500">Administra el acceso y roles del sistema.</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}>
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            <div className="table-container shadow-sm">
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td className="font-medium text-slate-800">{u.username}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    {u.is_active ?
                                        <span className="badge badge-success flex items-center gap-1 w-fit"><UserCheck size={12} /> Activo</span> :
                                        <span className="badge badge-danger flex items-center gap-1 w-fit"><UserX size={12} /> Inactivo</span>
                                    }
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div className="flex justify-end gap-1">
                                        <button className="btn-icon" onClick={() => handleEdit(u)} title="Editar">
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(u.id)} title="Eliminar">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr><td colSpan="5" className="text-center p-8 text-muted">No hay usuarios registrados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
                                    placeholder="ej. jperez"
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
                                    placeholder="ej. juan@empresa.com"
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
                                <select className="select-control" name="role" value={formData.role} onChange={handleChange}>
                                    <option value="USER">Usuario (Vendedor)</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', marginTop: '1rem' }}>
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                        id="active-check"
                                    />
                                    <label htmlFor="active-check" style={{ marginBottom: 0, cursor: 'pointer' }}>Usuario Activo</label>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar Usuario</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
