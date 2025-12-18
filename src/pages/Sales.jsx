import React, { useEffect, useState, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Eye, RotateCcw, Trash2, AlertCircle, X, Search, Calendar, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency, formatDate } from '../utils/format';

const Sales = () => {
    const { user } = useContext(AuthContext);
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSale, setSelectedSale] = useState(null);
    const [showActionModal, setShowActionModal] = useState(null); // 'anular' or 'reembolsar'
    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchSales();
    }, []);

    useEffect(() => {
        if (!sales) return;
        setFilteredSales(sales.filter(s =>
            s.id.toString().includes(searchTerm) ||
            s.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    }, [searchTerm, sales]);

    const fetchSales = async () => {
        try {
            const response = await api.get('sales/sales/');
            setSales(response.data.results || response.data);
            setFilteredSales(response.data.results || response.data);
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

    if (loading) return <div className="p-8 text-center text-muted">Cargando ventas...</div>;

    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="sales-page">
            {/* Header / Toolbar */}
            <div className="card mb-6" style={{ marginBottom: '1.5rem' }}>
                <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search size={18} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--slate-400)' }} />
                        <input
                            className="input-control"
                            style={{ paddingLeft: '2.2rem' }}
                            placeholder="Buscar por ID o vendedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary">
                            <Calendar size={16} /> Fecha
                        </button>
                        <button className="btn btn-secondary">
                            <Filter size={16} /> Filtrar
                        </button>
                    </div>
                </div>
            </div>

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
                        {filteredSales.map(sale => (
                            <tr key={sale.id} className={sale.is_voided || sale.is_refunded ? 'row-muted opacity-60' : ''}>
                                <td className="font-bold text-muted">#{sale.id}</td>
                                <td>{formatDate(sale.date)}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                                            {sale.user_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium">{sale.user_name}</span>
                                    </div>
                                </td>
                                <td>{sale.payment_method}</td>
                                <td className="font-bold text-slate-800">{formatCurrency(sale.total)}</td>
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
                                    <button className="btn-icon" onClick={() => setSelectedSale(sale)} title="Ver Detalle">
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr><td colSpan="7" className="text-center p-8 text-muted">No se encontraron ventas</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sale Detail Modal */}
            {selectedSale && !showActionModal && (
                <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
                    <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header flex-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Detalle Venta #{selectedSale.id}</h3>
                            <button className="btn-icon" onClick={() => setSelectedSale(null)}><X size={20} /></button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <div><span className="text-xs text-slate-500 uppercase font-bold block">Fecha</span> {formatDate(selectedSale.date)}</div>
                            <div><span className="text-xs text-slate-500 uppercase font-bold block">Vendedor</span> {selectedSale.user_name}</div>
                            <div><span className="text-xs text-slate-500 uppercase font-bold block">Método</span> {selectedSale.payment_method}</div>
                            <div><span className="text-xs text-slate-500 uppercase font-bold block">Estado</span>
                                {selectedSale.is_voided ? <span className="text-red-600 font-bold">ANULADA</span> :
                                    selectedSale.is_refunded ? <span className="text-yellow-600 font-bold">REEMBOLSADA</span> :
                                        <span className="text-green-600 font-bold">COMPLETADA</span>}
                            </div>
                        </div>

                        <div className="mb-4 overflow-hidden rounded-md border border-slate-200">
                            <table className="styled-table" style={{ margin: 0 }}>
                                <thead>
                                    <tr>
                                        <th className="bg-slate-50 py-2 text-xs uppercase font-semibold text-slate-500">Producto</th>
                                        <th className="bg-slate-50 py-2 text-xs uppercase font-semibold text-slate-500 text-right">Cant</th>
                                        <th className="bg-slate-50 py-2 text-xs uppercase font-semibold text-slate-500 text-right">Precio</th>
                                        <th className="bg-slate-50 py-2 text-xs uppercase font-semibold text-slate-500 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSale.items.map(item => (
                                        <tr key={item.id}>
                                            <td className="py-2 text-sm text-slate-700">{item.producto_nombre}</td>
                                            <td className="py-2 text-sm text-slate-700 text-right">{item.quantity}</td>
                                            <td className="py-2 text-sm text-slate-700 text-right">{formatCurrency(item.price)}</td>
                                            <td className="py-2 text-sm text-slate-700 font-medium text-right">{formatCurrency(item.quantity * item.price)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-between items-end mb-6">
                            <div className="text-sm">
                                {(selectedSale.is_voided || selectedSale.is_refunded) && (
                                    <div className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-100 inline-flex items-center gap-1">
                                        <AlertCircle size={12} />
                                        Esta venta no puede ser modificada
                                    </div>
                                )}
                            </div>
                            <div className="text-right">
                                {selectedSale.discount > 0 && <p className="text-sm text-red-500">Descuento: -{formatCurrency(selectedSale.discount)}</p>}
                                <h4 className="text-xl font-bold text-slate-900">Total: {formatCurrency(selectedSale.total)}</h4>
                            </div>
                        </div>

                        <div className="modal-actions border-t border-slate-100 pt-4">
                            {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                                <>
                                    <button
                                        onClick={() => setShowActionModal('reembolsar')}
                                        className="btn btn-secondary text-warning-text hover:bg-warning-bg hover:border-warning-text flex items-center gap-2"
                                        style={{ marginRight: 'auto' }}
                                    >
                                        <RotateCcw size={16} /> Reembolsar
                                    </button>
                                    <button
                                        onClick={() => setShowActionModal('anular')}
                                        className="btn btn-secondary text-danger-text hover:bg-danger-bg hover:border-danger-text flex items-center gap-2"
                                    >
                                        <Trash2 size={16} /> Anular Venta
                                    </button>
                                </>
                            )}
                            <button className="btn btn-primary" onClick={() => setSelectedSale(null)}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Action Modal */}
            {showActionModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className={`text-lg font-bold mb-0 ${showActionModal === 'anular' ? 'text-red-600' : 'text-yellow-600'}`}>
                                {showActionModal === 'anular' ? 'Anular Venta' : 'Reembolsar Venta'}
                            </h3>
                        </div>
                        <form onSubmit={handleAction}>
                            <p className="text-sm text-slate-600 mb-4">
                                Para confirmar esta acción irreversible, por favor escriba <strong>{showActionModal === 'anular' ? 'borrar' : 'reembolsar'}</strong> en el campo de abajo.
                            </p>
                            <div className="form-group mb-4">
                                <input
                                    className="input-control w-full"
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder={showActionModal === 'anular' ? 'borrar' : 'reembolsar'}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="text-sm font-medium mb-1 block">Motivo (Opcional)</label>
                                <textarea
                                    className="input-control w-full"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Escriba el motivo aquí..."
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => { setShowActionModal(null); setConfirmText(''); setReason(''); }}
                                    disabled={actionLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className={`btn ${showActionModal === 'anular' ? 'btn-icon danger bg-red-600 text-white hover:bg-red-700' : 'btn-primary bg-yellow-600 border-yellow-600 hover:bg-yellow-700'}`}
                                    style={{ width: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}
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
