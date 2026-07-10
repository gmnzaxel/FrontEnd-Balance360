import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Save, Store, Eye } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
    const { isAdminActual, viewAsSeller, setViewAsSeller } = useContext(AuthContext);
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS',
        ticket_header: '',
        ticket_footer: '',
        ticket_address: '',
        ticket_cuit: '',
        ticket_iibb: '',
        ticket_iva: '',
        ticket_phone: '',
        ticket_email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('settings/');
            setSettings(response.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch('settings/', settings);
            toast.success("Configuración guardada.");
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setSaving(false);
        }
    };


    if (loading) return <div className="p-8 text-center text-muted">Cargando configuración…</div>;

    return (
        <div className="settings-page page page-container">
            <div className="page-header">
                <div className="page-header-title">
                    <p className="eyebrow">Sistema</p>
                    <h2 className="page-heading">Configuración</h2>
                    <p className="page-subtitle">Ajustes generales del negocio y del ticket.</p>
                </div>
                <div className="page-header-actions">
                    <button
                        onClick={handleSave}
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        <Save size={18} /> {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="settings-form page-section">
                {isAdminActual && (
                    <div className="card settings-card">
                        <div className="card-header settings-card-header">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Eye size={20} className="text-primary-600" />
                                Privacidad
                            </h3>
                        </div>

                        <div className="settings-section">
                            <div className="settings-row">
                                <div className="settings-row-content">
                                    <Eye size={18} className="text-primary-600" />
                                    <div>
                                        <p className="font-semibold text-slate-800">Vista de vendedor</p>
                                        <p className="text-sm text-slate-500">
                                            Oculta reportes, usuarios y accesos administrativos cuando usás una PC pública.
                                        </p>
                                    </div>
                                </div>
                                <label className="toggle-switch" aria-label="Activar vista de vendedor">
                                    <input
                                        type="checkbox"
                                        checked={viewAsSeller}
                                        onChange={(e) => setViewAsSeller(e.target.checked)}
                                    />
                                    <span className="slider" />
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Card 1: Branch & Inventory */}
                <div className="card settings-card">
                    <div className="card-header settings-card-header">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Store size={20} className="text-primary-600" />
                            Datos del negocio
                        </h3>
                    </div>

                    <div className="settings-section">
                        <div className="form-group">
                            <label className="font-semibold text-slate-700 mb-2 block">Nombre de la Sucursal</label>
                            <input
                                className="input-control"
                                type="text"
                                value={settings.branch_name}
                                onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                                required
                                placeholder="Ej. Casa Central"
                            />
                            <p className="text-xs text-slate-500 mt-2">Se mostrará en el encabezado de tus comprobantes.</p>
                        </div>

                    </div>
                </div>

                {/* Card 2: Ticket Customization */}
                <div className="card settings-card">
                    <div className="card-header settings-card-header settings-card-header-split">
                        <div className="settings-ticket-head">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-xl">🧾</span>
                                Diseño del ticket
                            </h3>
                            <p className="text-sm text-slate-500 settings-ticket-subtitle">Edita el texto del comprobante.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="btn btn-secondary settings-preview-btn"
                        >
                            <Eye size={18} /> Vista previa
                        </button>
                    </div>

                    <div className="settings-section">
                        <div className="form-group">
                            <label className="font-semibold text-slate-700 mb-2 block">Encabezado</label>
                            <textarea
                                className="input-control w-full font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                                rows={3}
                                value={settings.ticket_header || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_header: e.target.value })}
                                placeholder="Dirección del local&#10;Sitio web u otra información general"
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>
                        
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="font-semibold text-slate-700 mb-2 block">Dirección del Local (Ubicación)</label>
                            <input
                                className="input-control w-full"
                                type="text"
                                value={settings.ticket_address || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_address: e.target.value })}
                                placeholder="Ej: Av. Siempreviva 742, CABA"
                            />
                        </div>
                        
                        <div className="grid two-cols gap-sm" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">CUIT</label>
                                <input
                                    className="input-control w-full"
                                    type="text"
                                    value={settings.ticket_cuit || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_cuit: e.target.value })}
                                    placeholder="Ej: 20-12345678-9"
                                />
                            </div>
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">Ingresos Brutos (IIBB)</label>
                                <input
                                    className="input-control w-full"
                                    type="text"
                                    value={settings.ticket_iibb || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_iibb: e.target.value })}
                                    placeholder="Ej: 123-45678-9"
                                />
                            </div>
                        </div>

                        <div className="grid three-cols gap-sm" style={{ marginBottom: '1rem' }}>
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">Condición de IVA</label>
                                <input
                                    className="input-control w-full"
                                    type="text"
                                    value={settings.ticket_iva || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_iva: e.target.value })}
                                    placeholder="Ej: Responsable Inscripto"
                                />
                            </div>
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">Teléfono en Ticket</label>
                                <input
                                    className="input-control w-full"
                                    type="text"
                                    value={settings.ticket_phone || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_phone: e.target.value })}
                                    placeholder="Ej: 11-5555-5555"
                                />
                            </div>
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">Email en Ticket</label>
                                <input
                                    className="input-control w-full"
                                    type="email"
                                    value={settings.ticket_email || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_email: e.target.value })}
                                    placeholder="Ej: contacto@tienda.com"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="font-semibold text-slate-700 mb-2 block">Pie de Página</label>
                            <textarea
                                className="input-control w-full font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                                rows={3}
                                value={settings.ticket_footer || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_footer: e.target.value })}
                                placeholder="Mensaje de agradecimiento..."
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>
                    </div>
                </div>

            </form>

            {/* Ticket Preview Modal */}
            {showPreview && (
                <Modal
                    title="Vista previa del ticket"
                    onClose={() => setShowPreview(false)}
                    size="md"
                >
                    <div className="settings-preview-wrap" style={{ background: 'var(--slate-900)', padding: '20px', borderRadius: '8px' }}>
                        <div className="settings-preview-ticket" style={{ background: 'white', color: 'black', padding: '15px', width: '80mm', maxWidth: '100%', boxSizing: 'border-box', border: '1px solid #ccc', margin: '0 auto', fontSize: '12px', fontFamily: "'Courier New', Courier, monospace" }}>
                            {/* Header exact replication */}
                            <div className="text-center" style={{ borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
                                <div className="branch-title" style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '3px', display: 'inline-block', marginBottom: '8px' }}>
                                    {settings.branch_name || 'TU NEGOCIO'}
                                </div>
                                <div className="company" style={{ fontSize: '11px', color: '#333', marginBottom: '5px', whiteSpace: 'pre-wrap' }}>
                                    {settings.ticket_header || 'BALANCE 360'}
                                </div>
                                {settings.ticket_address && <div style={{ fontSize: '10px', color: '#555' }}>Dirección: {settings.ticket_address}</div>}
                                {settings.ticket_cuit && <div style={{ fontSize: '10px', color: '#555' }}>CUIT: {settings.ticket_cuit}</div>}
                                {settings.ticket_iibb && <div style={{ fontSize: '10px', color: '#555' }}>IIBB: {settings.ticket_iibb}</div>}
                                {settings.ticket_iva && <div style={{ fontSize: '10px', color: '#555' }}>IVA: {settings.ticket_iva}</div>}
                                {settings.ticket_phone && <div style={{ fontSize: '10px', color: '#555' }}>Tel: {settings.ticket_phone}</div>}
                                {settings.ticket_email && <div style={{ fontSize: '10px', color: '#555' }}>Email: {settings.ticket_email}</div>}
                                <div style={{ fontSize: '10px', color: '#555', marginTop: '5px' }}>Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR', { hour12: false })}</div>
                                <div style={{ fontSize: '10px', color: '#555' }}>Ticket #12345</div>
                                <div style={{ fontSize: '10px', color: '#555' }}>Pago: EFECTIVO</div>
                            </div>

                            {/* Table exact replication */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #000' }}>
                                        <th style={{ textAlign: 'left', width: '55%', fontSize: '12px' }}>Producto</th>
                                        <th style={{ textAlign: 'right', width: '15%', fontSize: '12px' }}>Cant</th>
                                        <th style={{ textAlign: 'right', width: '30%', fontSize: '12px' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px 0', fontSize: '12px' }}>
                                            CAMISA LINO
                                            <br />
                                            <small style={{ fontSize: '10px', color: '#555' }}>Desc: -$5.000,00</small>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 0', fontSize: '12px' }}>1</td>
                                        <td style={{ textAlign: 'right', padding: '4px 0', fontSize: '12px' }}>$82.500,00</td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Totals exact replication */}
                            <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Subtotal:</span>
                                    <span>$82.500,00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>Descuento:</span>
                                    <span>-$5.000,00</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px' }}>
                                    <span>TOTAL:</span>
                                    <span>$77.500,00</span>
                                </div>
                            </div>

                            {/* Footer exact replication */}
                            <div className="text-center" style={{ marginTop: '20px', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
                                <p>{settings.ticket_footer || '¡Gracias por su compra!'}</p>
                                <p style={{ marginTop: '5px', fontSize: '9px', color: '#777' }}>*** Copia Cliente ***</p>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Settings;
