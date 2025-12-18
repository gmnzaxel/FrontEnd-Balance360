import React, { useEffect, useState, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Eye, RotateCcw, Trash2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency, formatDate } from '../utils/format';

const Sales = () => {
    const { user } = useContext(AuthContext);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showActionModal, setShowActionModal] = useState(null); // 'anular' or 'reembolsar'
    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        try {
            const response = await api.get('sales/sales/');
            setSales(response.data.results || response.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar ventas");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (e) => {
        e.preventDefault();
        const actionType = showActionModal;
        const id = selectedSale.id;

        const expectedText = actionType === 'anular' ? 'borrar' : 'reembolsar';
        if (confirmText !== expectedText) {
            toast.error(`Debe escribir '${expectedText}' para confirmar.`);
            return;
        }

        setActionLoading(true);
        try {
            const endpoint = actionType === 'anular' ? 'anular' : 'reembolsar';
            await api.post(`sales/sales/${id}/${endpoint}/`, {
                confirm_text: confirmText,
                reason: reason
            });
            toast.success(`Venta ${actionType === 'anular' ? 'anulada' : 'reembolsada'} con éxito`);
            setShowActionModal(null);
            setConfirmText('');
            setReason('');
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Error al procesar la acción");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando ventas...</div>;

    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="sales-page fade-in">
            <div className="table-container shadow-sm">
                <table className="styled-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Fecha</th>
                            <th>Vendedor</th>
                            <th>Método</th>
                            <th>Total</th>
                            <th>Estado</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sales.map(sale => (
                            <tr key={sale.id} className={sale.is_voided || sale.is_refunded ? 'row-muted' : ''}>
                                <td className="font-bold text-muted">#{sale.id}</td>
                                <td>{formatDate(sale.date)}</td>
                                <td>
                                    <span className="badge badge-neutral">{sale.user_name}</span>
                                </td>
                                <td>{sale.payment_method}</td>
                                <td className="font-bold text-success">{formatCurrency(sale.total)}</td>
                                <td>
                                    {sale.is_voided ? (
                                        <span className="badge badge-danger">ANULADA</span>
                                    ) : sale.is_refunded ? (
                                        <span className="badge badge-warning">REEMBOLSADA</span>
                                    ) : (
                                        <span className="badge badge-success">COMPLETA</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="btn-icon" onClick={() => setSelectedSale(sale)}>
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Sale Detail Modal */}
            {selectedSale && !showActionModal && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal sale-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalle Venta #{selectedSale.id}</h3>
                            <button className="close-btn" onClick={() => setSelectedSale(null)}><XCircle size={20} /></button>
                        </div>

                        <div className="sale-info-grid">
                            <p><strong>Fecha:</strong> {formatDate(selectedSale.date)}</p>
                            <p><strong>Vendedor:</strong> {selectedSale.user_name}</p>
                            <p><strong>Método:</strong> {selectedSale.payment_method}</p>
                            <p><strong>Estado:</strong>
                                {selectedSale.is_voided ? ' ANULADA' : selectedSale.is_refunded ? ' REEMBOLSADA' : ' COMPLETADA'}
                            </p>
                        </div>

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
                                        <td>{formatCurrency(item.price)}</td>
                                        <td>{formatCurrency(item.quantity * item.price)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="modal-footer">
                            <div className="sale-totals">
                                {selectedSale.discount > 0 && <p className="text-danger">Descuento: -{formatCurrency(selectedSale.discount)}</p>}
                                <h4 className="grand-total">Total: {formatCurrency(selectedSale.total)}</h4>
                            </div>

                            {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                                <div className="action-buttons-group">
                                    <button
                                        onClick={() => setShowActionModal('reembolsar')}
                                        className="btn-warning-outline"
                                    >
                                        <RotateCcw size={16} /> Reembolsar
                                    </button>
                                    <button
                                        onClick={() => setShowActionModal('anular')}
                                        className="btn-danger-outline"
                                    >
                                        <Trash2 size={16} /> Anular Venta
                                    </button>
                                </div>
                            )}

                            {(selectedSale.is_voided || selectedSale.is_refunded) && (
                                <div className="action-notice">
                                    <AlertCircle size={16} />
                                    <span>Esta venta no puede ser modificada</span>
                                    {selectedSale.void_reason && <p className="reason-text">Motivo: {selectedSale.void_reason}</p>}
                                    {selectedSale.refund_reason && <p className="reason-text">Motivo: {selectedSale.refund_reason}</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Action Modal (Anular / Reembolsar) */}
            {showActionModal && (
                <div className="modal-overlay">
                    <div className="modal action-confirm-modal">
                        <div className="modal-header">
                            <h3 className={showActionModal === 'anular' ? 'text-danger' : 'text-warning'}>
                                {showActionModal === 'anular' ? 'Anular Venta' : 'Reembolsar Venta'}
                            </h3>
                        </div>
                        <form onSubmit={handleAction}>
                            <p className="confirm-instruction">
                                Para confirmar, escriba <strong>{showActionModal === 'anular' ? 'borrar' : 'reembolsar'}</strong> a continuación:
                            </p>
                            <div className="form-group">
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder={showActionModal === 'anular' ? 'borrar' : 'reembolsar'}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group">
                                <label>Motivo (Opcional)</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Escriba el motivo aquí..."
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => { setShowActionModal(null); setConfirmText(''); setReason(''); }}
                                    disabled={actionLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={showActionModal === 'anular' ? 'btn-danger' : 'btn-warning'}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Procesando...' : (showActionModal === 'anular' ? 'Confirmar Anulación' : 'Confirmar Reembolso')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
