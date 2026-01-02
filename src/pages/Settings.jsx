import React, { useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Save, Store, Eye, Trash2 } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { AuthContext } from '../context/AuthContext';

const Settings = () => {
    const { user } = useContext(AuthContext);
    const isAdmin = user?.role === 'ADMIN';
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [showPreview, setShowPreview] = useState(false);
    const [purgeConfirm, setPurgeConfirm] = useState('');

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

    const handlePurgeProducts = async () => {
        if (purgeConfirm !== 'BORRAR') {
            toast.error("Escribí BORRAR para confirmar.");
            return;
        }
        setSaving(true);
        try {
            await api.post('inventory/products/purge/');
            toast.success('Productos eliminados.');
            setPurgeConfirm('');
        } catch (error) {
            toast.error(error.response?.data?.error || "No se pudo eliminar.");
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

                {settings && isAdmin && (
                    <div className="card settings-card">
                        <div className="card-header settings-card-header">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Trash2 size={20} className="text-danger-600" />
                                Operaciones avanzadas
                            </h3>
                        </div>
                        <div className="settings-section">
                            <div className="form-group">
                                <label className="font-semibold text-slate-700 mb-2 block">Borrar todos los productos</label>
                                <p className="text-xs text-slate-500 mb-3">
                                    Esta acción elimina definitivamente todos los productos y movimientos de stock. Solo ADMIN.
                                </p>
                                <div className="grid two-cols">
                                    <input
                                        className="input-control"
                                        type="text"
                                        value={purgeConfirm}
                                        onChange={(e) => setPurgeConfirm(e.target.value)}
                                        placeholder="Escribí BORRAR"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger"
                                        disabled={saving}
                                        onClick={handlePurgeProducts}
                                    >
                                        {saving ? 'Procesando…' : 'Eliminar productos'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
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
                                rows={4}
                                value={settings.ticket_header || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_header: e.target.value })}
                                placeholder="Nombre de la empresa&#10;Dirección&#10;Teléfono"
                                style={{ resize: 'vertical', minHeight: '100px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label className="font-semibold text-slate-700 mb-2 block">Pie de Página</label>
                            <textarea
                                className="input-control w-full font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                                rows={4}
                                value={settings.ticket_footer || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_footer: e.target.value })}
                                placeholder="Mensaje de agradecimiento..."
                                style={{ resize: 'vertical', minHeight: '100px' }}
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
                    <div className="settings-preview-wrap">
                        <div className="settings-preview-ticket">
                            {/* Paper Texture Content */}
                            <div className="text-center mb-6">
                                <h4 className="font-bold text-slate-900 text-lg mb-2 uppercase break-words border-b-2 border-slate-900 pb-2 inline-block">
                                    {settings.branch_name || 'TU NEGOCIO'}
                                </h4>
                                <div className="whitespace-pre-wrap text-slate-500 mb-4 mt-2">
                                    {settings.ticket_header || 'Dirección del Local\nTel: 555-1234\nwww.tubalance360.com'}
                                </div>
                            </div>

                            <div className="border-t border-b border-dashed border-slate-300 py-3 my-4">
                                <div className="flex justify-between font-bold text-slate-700 mb-2">
                                    <span>CANT. DESC.</span>
                                    <span>TOTAL</span>
                                </div>
                                <div className="flex justify-between mb-1">
                                    <span>1 x CAMISA LINO</span>
                                    <span>$ 45.000</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>1 x PANTALON</span>
                                    <span>$ 32.500</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-base font-bold text-slate-900 mb-6">
                                <span>TOTAL</span>
                                <span>$ 77.500</span>
                            </div>

                            <div className="text-center">
                                <div className="whitespace-pre-wrap mb-4 italic text-slate-400">
                                    {settings.ticket_footer || '¡Gracias por su compra!'}
                                </div>
                                <div className="text-xxs text-slate-300 flex flex-col gap-1 items-center">
                                    <span>*** COPIA CLIENTE ***</span>
                                    <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="h-8 bg-slate-800 w-3/4 mx-auto mt-4 opacity-10"></div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Settings;
