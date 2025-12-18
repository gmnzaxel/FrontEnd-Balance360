import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Settings as SettingsIcon, Save, Store, Globe } from 'lucide-react';

const Settings = () => {
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('core/settings/'); // Based on core/urls.py router
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

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    return (
        <div className="settings-page fade-in">
            <div className="card max-w-2xl mx-auto">
                <div className="card-header">
                    <SettingsIcon size={20} className="text-primary" />
                    <h3>Configuración General</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label><Store size={16} /> Nombre de la Sucursal</label>
                            <input
                                type="text"
                                value={settings.branch_name}
                                onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                                required
                            />
                            <p className="help-text">Este nombre aparecerá en los reportes y tickets.</p>
                        </div>

                        <div className="form-group">
                            <label><Globe size={16} /> Moneda</label>
                            <input
                                type="text"
                                value={settings.currency}
                                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                                required
                            />
                            <p className="help-text">Ej: ARS, USD, EUR.</p>
                        </div>

                        <button type="submit" className="btn-primary" disabled={saving}>
                            <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Settings;
