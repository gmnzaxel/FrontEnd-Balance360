import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, Save, Store, Globe, AlertOctagon, Eye, X } from 'lucide-react';
import Modal from '../components/ui/Modal';

const Settings = () => {
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS',
        stock_minimo_por_distribuidor_enabled: false
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
            toast.success("Configuración guardada");
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted">Cargando configuración...</div>;

    return (
        <div className="settings-page max-w-4xl mx-auto pb-12 relative">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">Configuración</h2>
                    <p className="text-slate-500">Personaliza la experiencia de tu punto de venta.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn btn-primary lg flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                    disabled={saving}
                >
                    <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-6">

                {/* Card 1: Branch & Inventory */}
                <div className="card shadow-sm border border-slate-200">
                    <div className="card-header border-b border-slate-100 pb-4 mb-6">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Store size={20} className="text-primary-600" />
                            Datos del Negocio
                        </h3>
                    </div>

                    <div className="flex flex-col gap-6">
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

                        <div className="border-t border-slate-50 pt-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 text-amber-600">
                                        <AlertOctagon size={18} />
                                    </div>
                                    <div>
                                        <span className="block font-semibold text-slate-800 text-sm mb-1">Stock Mínimo por Distribuidor</span>
                                        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                                            Activa alertas de reabastecimiento personalizadas para cada proveedor en tu inventario.
                                        </p>
                                    </div>
                                </div>
                                <label className="toggle-switch transform scale-90 flex-shrink-0 ml-4">
                                    <input
                                        type="checkbox"
                                        checked={settings.stock_minimo_por_distribuidor_enabled}
                                        onChange={(e) => setSettings({ ...settings, stock_minimo_por_distribuidor_enabled: e.target.checked })}
                                    />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2: Ticket Customization */}
                <div className="card shadow-sm border border-slate-200">
                    <div className="card-header border-b border-slate-100 pb-4 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="text-xl">🧾</span>
                                Diseño del Ticket
                            </h3>
                            <p className="text-sm text-slate-500 mt-1 ml-4 hidden sm:block">Edita el texto del comprobante.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="btn btn-secondary sm flex items-center gap-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50"
                        >
                            <Eye size={18} /> Vista Previa
                        </button>
                    </div>

                    <div className="flex flex-col gap-6">
                        <div className="form-group">
                            <label className="font-semibold text-slate-700 mb-2 block">Encabezado</label>
                            <textarea
                                className="input-control w-full font-mono text-sm bg-slate-50 focus:bg-white transition-colors"
                                rows={4}
                                value={settings.ticket_header || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_header: e.target.value })}
                                placeholder="Nombre Empresa&#10;Dirección&#10;Teléfono"
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
                    title="VISTA PREVIA DEL TICKET"
                    onClose={() => setShowPreview(false)}
                    size="md"
                >
                    <div className="flex justify-center bg-slate-50 p-6 rounded-lg border border-slate-200">
                        <div className="bg-white p-6 shadow-md font-mono text-xs text-slate-600 leading-relaxed w-full max-w-[300px] border border-slate-100">
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
                                <div className="text-[10px] text-slate-300 flex flex-col gap-1 items-center">
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
