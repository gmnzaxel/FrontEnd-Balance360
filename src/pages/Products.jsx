import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Edit, Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '../utils/format';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formData, setFormData] = useState({
        codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, costo_compra: 0, precio_venta: 0
    });

    const fetchProducts = async () => {
        try {
            const response = await api.get('inventory/products/');
            setProducts(response.data.results || response.data); // Handle pagination if present
        } catch (error) {
            toast.error("Error al cargar productos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('¿Eliminar producto?')) {
            try {
                await api.delete(`inventory/products/${id}/`);
                toast.success('Producto eliminado');
                fetchProducts();
            } catch (error) {
                toast.error('Error al eliminar');
            }
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setFormData(product);
        setShowModal(true);
    };

    const handleCreate = () => {
        setEditingProduct(null);
        setFormData({ codigo: '', nombre: '', stock_actual: 0, stock_minimo: 5, costo_compra: 0, precio_venta: 0 });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingProduct) {
                await api.put(`inventory/products/${editingProduct.id}/`, formData);
                toast.success('Producto actualizado');
            } else {
                await api.post('inventory/products/', formData);
                toast.success('Producto creado');
            }
            setShowModal(false);
            fetchProducts();
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('inventory/products/import/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { created, updated, errors } = response.data;
            let msg = `Importación completada.\nCreados: ${created}\nActualizados: ${updated}`;
            if (errors.length > 0) msg += `\nErrores: ${errors.length}`;
            alert(msg);
            fetchProducts();
        } catch (error) {
            toast.error('Error al importar archivo');
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="products-page">
            <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    {/* Search placeholder or title */}
                    <h3 style={{ fontSize: '1.1rem' }}>Gestión de Inventario</h3>
                </div>
                <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        Importar Excel
                        <input type="file" hidden onChange={handleImport} accept=".csv, .xlsx" />
                    </label>
                    <button className="btn btn-primary" onClick={handleCreate}><Plus size={16} /> Nuevo Producto</button>
                </div>
            </div>

            <div className="table-container shadow-sm">
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Nombre</th>
                            <th>Stock</th>
                            <th>Mínimo</th>
                            <th>Costo</th>
                            <th>Precio</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td className="font-bold text-muted">{p.codigo}</td>
                                <td>{p.nombre}</td>
                                <td>
                                    {p.bajo_stock ? (
                                        <span className="badge badge-danger">Bajo: {p.stock_actual}</span>
                                    ) : (
                                        <span className="badge badge-success">{p.stock_actual}</span>
                                    )}
                                </td>
                                <td>{p.stock_minimo}</td>
                                <td>{formatCurrency(p.costo_compra)}</td>
                                <td className="font-bold">{formatCurrency(p.precio_venta)}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-icon" onClick={() => handleEdit(p)}><Edit size={18} /></button>
                                    <button className="btn-icon danger" onClick={() => handleDelete(p.id)}><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Código</label>
                                <input value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Nombre</label>
                                <input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Stock Inicial</label>
                                    <input type="number" value={formData.stock_actual} onChange={e => setFormData({ ...formData, stock_actual: e.target.value })} disabled={!!editingProduct} />
                                </div>
                                <div className="form-group">
                                    <label>Stock Mínimo</label>
                                    <input type="number" value={formData.stock_minimo} onChange={e => setFormData({ ...formData, stock_minimo: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Costo</label>
                                    <input type="number" step="0.01" value={formData.costo_compra} onChange={e => setFormData({ ...formData, costo_compra: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Precio Venta</label>
                                    <input type="number" step="0.01" value={formData.precio_venta} onChange={e => setFormData({ ...formData, precio_venta: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Products;
