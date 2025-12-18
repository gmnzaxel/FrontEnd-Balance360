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
        return <div className="p-4">No tienes permisos para ver esta página.</div>;
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
        const confirmText = prompt("Escriba 'borrar' para confirmar la eliminación del usuario:");
        if (confirmText !== 'borrar') return;

        try {
            await api.delete(`users/users/${id}/`);
            toast.success("Usuario eliminado");
            fetchUsers();
        } catch (error) {
            console.error(error);
            toast.error("Error al eliminar");
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
        <div className="users-page fade-in">
            <div className="page-header">
                <h2>Gestión de Usuarios</h2>
                <button className="btn-primary" onClick={() => { setEditingUser(null); resetForm(); setShowModal(true); }}>
                    <Plus size={18} /> Nuevo Usuario
                </button>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>{u.username}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-neutral'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td>
                                    {u.is_active ?
                                        <span className="badge badge-success"><UserCheck size={12} /> Activo</span> :
                                        <span className="badge badge-danger"><UserX size={12} /> Inactivo</span>
                                    }
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button className="btn-icon" onClick={() => handleEdit(u)}>
                                            <Edit size={18} />
                                        </button>
                                        <button className="btn-icon danger" onClick={() => handleDelete(u.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Usuario</label>
                                <input name="username" value={formData.username} onChange={handleChange} required disabled={!!editingUser} />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} />
                            </div>
                            {!editingUser && (
                                <div className="form-group">
                                    <label>Contraseña</label>
                                    <input type="password" name="password" value={formData.password} onChange={handleChange} required />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Rol</label>
                                <select name="role" value={formData.role} onChange={handleChange}>
                                    <option value="USER">Usuario (Vendedor)</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                                    Activo
                                </label>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Users;
