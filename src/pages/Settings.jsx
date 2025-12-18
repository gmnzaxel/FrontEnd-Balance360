import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, Save, Store, Globe, AlertOctagon } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS',
        stock_minimo_por_distribuidor_enabled: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('core/settings/');
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
            await api.patch('core/settings/', settings);
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
        <div className="settings-page max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Configuración General</h2>
            </div>

            <div className="card">
                <div className="card-header border-b border-gray-100 pb-4 mb-4">
                    <div className="flex items-center gap-2 text-primary-600">
                        <SettingsIcon size={20} />
                        <h3 className="text-lg font-semibold text-slate-800 m-0">Parámetros del Sistema</h3>
                    </div>
                </div>

                <form onSubmit={handleSave}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="form-group">
                            <label className="flex items-center gap-2">
                                <Store size={16} className="text-slate-400" />
                                Nombre de la Sucursal
                            </label>
                            <input
                                className="input-control"
                                type="text"
                                value={settings.branch_name}
                                onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                                required
                                placeholder="Ej. Casa Central"
                            />
                            <p className="text-xs text-slate-500 mt-1">Este nombre aparecerá en los reportes y tickets emitidos.</p>
                        </div>

                        <div className="form-group">
                            <label className="flex items-center gap-2">
                                <Globe size={16} className="text-slate-400" />
                                Moneda Principal
                            </label>
                            <input
                                className="input-control"
                                type="text"
                                value={settings.currency}
                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                required
                                placeholder="ARS"
                            />
                            <p className="text-xs text-slate-500 mt-1">Código ISO de la moneda (Ej: ARS, USD).</p>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6 flex items-center justify-between">
                        <div className="flex gap-3">
                            <div className="mt-1 text-warning-text bg-warning-bg p-1.5 rounded-full h-fit">
                                <AlertOctagon size={18} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-800 mb-1">
                                    Stock Mínimo por Distribuidor
                                </label>
                                <p className="text-sm text-slate-600 max-w-md">
                                    Habilitar esta opción permite definir niveles de alerta de stock personalizados para cada proveedor, mejorando la gestión de reabastecimiento.
                                </p>
                            </div>
                        </div>
                        <div className="toggle-switch flex-shrink-0 ml-4">
                            <input
                                type="checkbox"
                                checked={settings.stock_minimo_por_distribuidor_enabled}
                                onChange={(e) => setSettings({ ...settings, stock_minimo_por_distribuidor_enabled: e.target.checked })}
                            />
                            <span className="slider"></span>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" className="btn btn-primary lg flex items-center gap-2" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
