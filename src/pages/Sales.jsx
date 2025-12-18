import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { Eye } from 'lucide-react';

const Sales = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await api.get('sales/sales/');
            setSales(response.data.results || response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefund = async (id) => {
        if (window.confirm('¿Estás seguro de reembolsar esta venta? Esto devolverá el stock.')) {
            try {
                await api.post(`sales/sales/${id}/refund/`);
                // toast.success('Venta reembolsada'); // toast is not imported yet, let's fix imports
                alert('Venta reembolsada');
                setSelectedSale(null);
                fetchSales();
            } catch (error) {
                alert('Error al reembolsar');
                console.error(error);
            }
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="sales-page">
            <div className="sales-list">
                <h2>Historial de Ventas</h2>
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Método</th>
                            <th>Total</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map(sale => (
                            <tr key={sale.id}>
                                <td>#{sale.id}</td>
                                <td>{new Date(sale.date).toLocaleString()}</td>
                                <td>{sale.user_name}</td>
                                <td>{sale.payment_method}</td>
                                <td>${sale.total}</td>
                                <td>
                                    <button className="icon-btn" onClick={() => setSelectedSale(sale)}>
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedSale && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Detalle Venta #{selectedSale.id}</h3>
                        <p><strong>Fecha:</strong> {new Date(selectedSale.date).toLocaleString()}</p>
                        <p><strong>Vendedor:</strong> {selectedSale.user_name}</p>
                        <p><strong>Método:</strong> {selectedSale.payment_method}</p>

                        <table className="detail-table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cant</th>
                                    <th>Precio</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedSale.items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.producto_nombre}</td>
                                        <td>{item.quantity}</td>
                                        <td>${item.price}</td>
                                        <td>${(item.quantity * item.price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="modal-footer">
                            <p>Descuento: -${selectedSale.discount}</p>
                            <h4>Total: ${selectedSale.total}</h4>
                            <div className="modal-actions">
                                <button onClick={() => handleRefund(selectedSale.id)} className="btn-danger-icon">
                                    Reembolsar Venta
                                </button>
                                <button onClick={() => setSelectedSale(null)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
