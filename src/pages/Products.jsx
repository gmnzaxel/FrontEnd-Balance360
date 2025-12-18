import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Edit, Trash2, Plus } from 'lucide-react';

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
            <div className="page-header">
                <h2>Inventario</h2>
                <div className="actions">
                    <label className="btn-primary" style={{ cursor: 'pointer', marginRight: '10px' }}>
                        Importar CSV/XLSX
                        <input type="file" hidden onChange={handleImport} accept=".csv, .xlsx" />
                    </label>
                    <button className="btn-primary" onClick={handleCreate}><Plus size={16} /> Nuevo Producto</button>
                </div>
            </div>

            <table className="data-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Stock</th>
                        <th>Mínimo</th>
                        <th>Costo</th>
                        <th>Precio</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p.id} className={p.bajo_stock ? 'low-stock' : ''}>
                            <td>{p.codigo}</td>
                            <td>{p.nombre}</td>
                            <td>{p.stock_actual}</td>
                            <td>{p.stock_minimo}</td>
                            <td>${p.costo_compra}</td>
                            <td>${p.precio_venta}</td>
                            <td>
                                <button className="icon-btn" onClick={() => handleEdit(p)}><Edit size={16} /></button>
                                <button className="icon-btn danger" onClick={() => handleDelete(p.id)}><Trash2 size={16} /></button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

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
