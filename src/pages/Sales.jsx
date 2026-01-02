import React, { useEffect, useState, useContext, useRef } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Eye, RotateCcw, Trash2, AlertCircle, X, Search, Calendar, Filter } from 'lucide-react';
import { toast } from 'react-toastify';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/ui/Modal';

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
    const [dateFilter, setDateFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const dateInputRef = useRef(null);

    useEffect(() => {
        fetchSales();
    }, []);

    useEffect(() => {
        if (!sales) return;
        setFilteredSales(sales.filter(s => {
            const matchesSearch = s.id.toString().includes(searchTerm) ||
                s.user_name?.toLowerCase().includes(searchTerm.toLowerCase());

            // Date filtering (matches YYYY-MM-DD part of ISO string)
            const matchesDate = dateFilter ? s.date.startsWith(dateFilter) : true;

            // Status filtering
            const matchesStatus = statusFilter === 'ALL' ? true :
                statusFilter === 'VOIDED' ? s.is_voided :
                    statusFilter === 'REFUNDED' ? s.is_refunded :
                        statusFilter === 'COMPLETED' ? (!s.is_voided && !s.is_refunded) : true;

            return matchesSearch && matchesDate && matchesStatus;
        }));
    }, [searchTerm, dateFilter, statusFilter, sales]);

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

    const handleHardDelete = async () => {
        if (!selectedSale) return;
        if (!window.confirm('Eliminar definitivamente esta venta anulada? Esta acción no se puede deshacer.')) return;
        try {
            await api.delete(`sales/sales/${selectedSale.id}/hard-delete/`);
            toast.success('Venta eliminada definitivamente');
            setShowActionModal(null);
            setSelectedSale(null);
            fetchSales();
        } catch (error) {
            toast.error(error.response?.data?.error || 'No se pudo eliminar la venta');
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Cargando ventas…</div>;

    const isAdmin = user?.role === 'ADMIN';

    return (
        <div className="sales-page page">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Ventas</p>
                    <h2 className="page-heading">Ventas</h2>
                    <p className="page-subtitle">Registrá, revisá y administrá las operaciones del negocio.</p>
                </div>
            </div>

            {/* Header / Toolbar */}
            <div className="card page-toolbar sales-toolbar">
                <div className="toolbar-group sales-search">
                    <Search size={18} className="sales-search-icon" />
                    <input
                        className="input-control sales-search-input"
                        placeholder="Buscar por ID o vendedor…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-group sales-actions">
                    {/* Date Picker using showPicker API */}
                    <div className="sales-filter">
                        <input
                            ref={dateInputRef}
                            type="date"
                            style={{
                                position: 'absolute',
                                visibility: 'hidden', // Completely hide it but keep it in DOM
                                width: 0,
                                height: 0,
                                bottom: 0,
                                left: 0
                            }}
                            onChange={(e) => setDateFilter(e.target.value)}
                            value={dateFilter}
                        />
                        <button
                            className={`ui-btn ${dateFilter ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                            onClick={() => {
                                if (dateInputRef.current) {
                                    try {
                                        dateInputRef.current.showPicker();
                                    } catch (err) {
                                        // Fallback for browsers not supporting showPicker
                                        dateInputRef.current.style.visibility = 'visible';
                                        dateInputRef.current.focus();
                                        dateInputRef.current.click();
                                        setTimeout(() => { dateInputRef.current.style.visibility = 'hidden'; }, 100);
                                    }
                                }
                            }}
                        >
                            <Calendar size={16} />
                            {dateFilter ? formatDate(dateFilter) : 'Fecha'}
                            {dateFilter && (
                                <div
                                    style={{ marginLeft: 8 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDateFilter('');
                                    }}
                                >
                                    <X size={14} />
                                </div>
                            )}
                        </button>
                    </div>

                    {/* Status Filter Dropdown */}
                    <div className="sales-filter">
                        <button
                            className={`ui-btn ${statusFilter !== 'ALL' ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                            onClick={() => setShowFilterMenu(!showFilterMenu)}
                        >
                            <Filter size={16} />
                            {statusFilter === 'ALL' ? 'Filtrar' :
                                statusFilter === 'COMPLETED' ? 'Completas' :
                                    statusFilter === 'VOIDED' ? 'Anuladas' : 'Reembolsadas'}
                        </button>

                        {showFilterMenu && (
                            <div className="user-dropdown" style={{ top: '110%', right: 0, minWidth: '160px', zIndex: 50 }}>
                                <button className={`dropdown-item ${statusFilter === 'ALL' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('ALL'); setShowFilterMenu(false); }}>
                                    Todas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'COMPLETED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('COMPLETED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span> Completadas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'VOIDED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('VOIDED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-red-500 mr-2"></span> Anuladas
                                </button>
                                <button className={`dropdown-item ${statusFilter === 'REFUNDED' ? 'font-bold' : ''}`} onClick={() => { setStatusFilter('REFUNDED'); setShowFilterMenu(false); }}>
                                    <span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span> Reembolsadas
                                </button>
                            </div>
                        )}

                        {/* Click outside closer helper could go here or generic window listener,
                            but for simplicity we assume user clicks option or toggles. */}
                        {showFilterMenu && (
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                onClick={() => setShowFilterMenu(false)}
                            />
                        )}
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
                        {filteredSales.map((sale) => (
                            <tr key={sale.id} className={sale.is_voided || sale.is_refunded ? 'row-muted opacity-60' : ''}>
                                <td className="font-bold text-muted" data-label="ID">#{sale.sale_number || sale.id}</td>
                                <td data-label="Fecha">{formatDate(sale.date)}</td>
                                <td data-label="Vendedor">
                                    <div className="flex items-center gap-1">
                                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                                            {sale.user_name?.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium">{sale.user_name}</span>
                                    </div>
                                </td>
                                <td data-label="Método">{sale.payment_method}</td>
                                <td className="font-bold text-slate-800" data-label="Total">{formatCurrency(sale.total)}</td>
                                <td data-label="Estado">
                                    {sale.is_voided ? (
                                        <span className="badge badge-danger">ANULADA</span>
                                    ) : sale.is_refunded ? (
                                        <span className="badge badge-warning">REEMBOLSADA</span>
                                    ) : (
                                        <span className="badge badge-success">COMPLETA</span>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right' }} data-label="Acciones">
                                    <button className="btn-icon" onClick={() => setSelectedSale(sale)} title="Ver detalle">
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan="7" className="text-center p-8 text-muted">Todavía no hay ventas para los filtros aplicados.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Sale Detail Modal */}
            {selectedSale && !showActionModal && (
                <Modal
                    title={`Detalle de venta #${selectedSale.sale_number || selectedSale.id}`}
                    onClose={() => setSelectedSale(null)}
                    size="lg"
                    footer={(
                        <div className="flex-between w-full">
                            {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                                <div className="flex-row gap-sm">
                                    <button
                                        onClick={() => setShowActionModal('reembolsar')}
                                        className="ui-btn ui-btn-secondary text-warning"
                                    >
                                        <RotateCcw size={16} /> Reembolsar venta
                                    </button>
                                    <button
                                        onClick={() => setShowActionModal('anular')}
                                        className="ui-btn ui-btn-danger"
                                    >
                                        <Trash2 size={16} /> Anular venta
                                    </button>
                                </div>
                            )}
                            {isAdmin && selectedSale.is_voided && (
                                <div className="flex-row gap-sm">
                                    <button
                                        onClick={handleHardDelete}
                                        className="ui-btn ui-btn-danger"
                                    >
                                        <Trash2 size={16} /> Eliminar venta
                                    </button>
                                </div>
                            )}
                            <div className="flex-row gap-sm ml-auto">
                                <button className="ui-btn ui-btn-primary" onClick={() => setSelectedSale(null)}>Cerrar</button>
                            </div>
                        </div>
                    )}
                >
                    <div className="sale-detail-modal stack gap-md">
                        {/* Summary Header */}
                        <div className="sale-detail-summary grid four-cols gap-md p-md bg-slate-50 rounded-lg border border-slate-200">
                            <div className="stack gap-xs">
                                <span className="eyebrow">Fecha</span>
                                <span className="font-medium text-slate-700">{formatDate(selectedSale.date)}</span>
                            </div>
                            <div className="stack gap-xs">
                                <span className="eyebrow">Vendedor</span>
                                <div className="flex-row gap-xs items-center">
                                    <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                                        {selectedSale.user_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-700">{selectedSale.user_name}</span>
                                </div>
                            </div>
                            <div className="stack gap-xs">
                                <span className="eyebrow">Método</span>
                                <span className="font-medium text-slate-700">{selectedSale.payment_method}</span>
                            </div>
                            <div className="stack gap-xs">
                                <span className="eyebrow">Estado</span>
                                <div>
                                    {selectedSale.is_voided ? <span className="badge badge-danger">ANULADA</span> :
                                        selectedSale.is_refunded ? <span className="badge badge-warning">REEMBOLSADA</span> :
                                            <span className="badge badge-success">COMPLETADA</span>}
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="table-container compact sale-detail-items">
                            <table className="styled-table">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th style={{ textAlign: 'right' }}>Cant.</th>
                                        <th style={{ textAlign: 'right' }}>Precio</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedSale.items.map(item => {
                                        const itemLabel = item.item_type === 'SERVICIO'
                                            ? (item.description || 'Servicio')
                                            : (item.producto_nombre || 'Producto');
                                        return (
                                        <tr key={item.id}>
                                            <td data-label="Producto">{itemLabel}</td>
                                            <td style={{ textAlign: 'right' }} data-label="Cant.">{item.quantity}</td>
                                            <td style={{ textAlign: 'right' }} data-label="Precio">{formatCurrency(item.price)}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600 }} data-label="Total">{formatCurrency(item.quantity * item.price)}</td>
                                        </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="flex-col items-end gap-xs pt-sm border-t border-slate-200">
                            {selectedSale.discount > 0 && (
                                <div className="flex-row gap-lg text-sm text-danger-text">
                                    <span>Descuento:</span>
                                    <span>- {formatCurrency(selectedSale.discount)}</span>
                                </div>
                            )}
                            <div className="flex-row gap-lg text-lg font-bold text-slate-900">
                                <span>Total:</span>
                                <span>{formatCurrency(selectedSale.total)}</span>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Confirmation Action Modal */}
            {showActionModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className={`text-lg font-bold mb-0 ${showActionModal === 'anular' ? 'text-red-600' : 'text-yellow-600'}`}>
                                {showActionModal === 'anular' ? 'Anular venta' : 'Reembolsar venta'}
                            </h3>
                        </div>
                        <form onSubmit={handleAction}>
                            <p className="text-sm text-slate-600 mb-4">
                                Para confirmar esta acción irreversible, escribí <strong>{showActionModal === 'anular' ? 'borrar' : 'reembolsar'}</strong> en el campo de abajo.
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
                                <label className="text-sm font-medium mb-1 block">Motivo (opcional)</label>
                                <textarea
                                    className="input-control w-full"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Escribí el motivo (opcional)…"
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
                                    className={`btn confirm-action ${showActionModal === 'anular' ? 'confirm-danger' : 'confirm-warning'}`}
                                    style={{ width: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? 'Procesando…' : (showActionModal === 'anular' ? 'Anular venta' : 'Reembolsar venta')}
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
