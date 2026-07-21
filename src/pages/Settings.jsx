import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../api/axios';
import { toast } from 'react-toastify';
import { Save, Store, Eye, ImageIcon, X, Upload } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { AuthContext } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';

const Settings = () => {
    const { isAdminActual, viewAsSeller, setViewAsSeller } = useContext(AuthContext);
    const [settings, setSettings] = useState({
        branch_name: '',
        currency: 'ARS',
        ticket_header: '',
        ticket_footer: '',
        ticket_logo: '',
        ticket_address: '',
        ticket_cuit: '',
        ticket_iibb: '',
        ticket_iva: '',
        ticket_phone: '',
        ticket_email: '',
        daily_sales_goal: 100000.00
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [logoDataUrl, setLogoDataUrl] = useState(() => localStorage.getItem('ticket_logo') || '');
    const logoInputRef = useRef(null);

    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await api.get('settings/');
            setSettings(response.data);
            if (response.data.ticket_logo) {
                setLogoDataUrl(response.data.ticket_logo);
                localStorage.setItem('ticket_logo', response.data.ticket_logo);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
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

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (ev) => {
                const img = new Image();
                img.src = ev.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 200;
                    const MAX_HEIGHT = 200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Export as PNG to preserve transparent backgrounds
                    const dataUrl = canvas.toDataURL('image/png');
                    resolve(dataUrl);
                };
                img.onerror = () => {
                    resolve(ev.target.result); // fallback to original
                };
            };
            reader.onerror = () => {
                resolve('');
            };
        });
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        try {
            const compressedDataUrl = await compressImage(file);
            if (!compressedDataUrl) {
                toast.error('Error al procesar la imagen.');
                return;
            }
            setLogoDataUrl(compressedDataUrl);
            setSettings(prev => ({ ...prev, ticket_logo: compressedDataUrl }));
            localStorage.setItem('ticket_logo', compressedDataUrl);
            toast.success('Logo cargado correctamente. Recuerda guardar los cambios.');
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar el logo.');
        }
    };

    const handleRemoveLogo = () => {
        setLogoDataUrl('');
        setSettings(prev => ({ ...prev, ticket_logo: '' }));
        localStorage.removeItem('ticket_logo');
        if (logoInputRef.current) logoInputRef.current.value = '';
        toast.info('Logo removido. Recuerda guardar los cambios.');
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
                    <Button
                        onClick={handleSave}
                        variant="primary"
                        loading={saving}
                        icon={<Save size={18} />}
                    >
                        Guardar cambios
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSave} className="settings-form page-section">
                {isAdminActual && (
                    <div className="card settings-card">
                        <div className="card-header settings-card-header">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Eye size={20} className="text-primary-600" />
                                Privacidad
                            </h3>
                        </div>

                        <div className="settings-section">
                            <div className="settings-row">
                                <div className="settings-row-content">
                                    <Eye size={18} className="text-primary-600" />
                                    <div>
                                        <p className="font-semibold">Vista de vendedor</p>
                                        <p className="text-sm text-muted">
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
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <Store size={20} className="text-primary-600" />
                            Datos del negocio
                        </h3>
                    </div>

                    <div className="settings-section">
                        <Input
                            label="Nombre de la Sucursal"
                            type="text"
                            value={settings.branch_name}
                            onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                            required
                            placeholder="Ej. Casa Central"
                            helper="Se mostrará en el encabezado de tus comprobantes."
                        />
                    </div>
                </div>

                {/* Card 2: Ticket Customization */}
                <div className="card settings-card">
                    <div className="card-header settings-card-header settings-card-header-split">
                        <div className="settings-ticket-head">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <span className="text-xl">🧾</span>
                                Diseño del ticket
                            </h3>
                            <p className="text-sm text-muted settings-ticket-subtitle">Edita el texto del comprobante.</p>
                        </div>
                        <Button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            variant="secondary"
                            className="settings-preview-btn"
                            icon={<Eye size={18} />}
                        >
                            Vista previa
                        </Button>
                    </div>

                    <div className="settings-section form-stack">
                        {/* Logo Upload Section */}
                        <div className="settings-logo-section">
                            <div className="settings-logo-label">
                                <ImageIcon size={16} className="text-primary-500" />
                                <div>
                                    <p className="font-semibold text-sm">Logo del negocio <span className="text-muted font-normal">(opcional)</span></p>
                                    <p className="text-xs text-muted">Se mostrará en la parte superior de tus tickets y presupuestos. Máx. 500 KB.</p>
                                </div>
                            </div>

                            {logoDataUrl ? (
                                <div className="settings-logo-preview">
                                    <img src={logoDataUrl} alt="Logo del negocio" className="settings-logo-img" />
                                    <button
                                        type="button"
                                        className="settings-logo-remove"
                                        onClick={handleRemoveLogo}
                                        aria-label="Eliminar logo"
                                    >
                                        <X size={14} /> Quitar logo
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    className="settings-logo-upload-btn"
                                    onClick={() => logoInputRef.current?.click()}
                                >
                                    <Upload size={18} />
                                    <span>Subir imagen (PNG, JPG, SVG)</span>
                                </button>
                            )}
                            <input
                                ref={logoInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                                style={{ display: 'none' }}
                                onChange={handleLogoChange}
                            />
                        </div>

                        <label className="ui-field">
                            <span className="field-label">Encabezado</span>
                            <div className="field-control">
                                <textarea
                                    className="textarea-control font-mono text-sm transition-colors"
                                    rows={3}
                                    value={settings.ticket_header || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_header: e.target.value })}
                                    placeholder="Dirección del local&#10;Sitio web u otra información general"
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                        </label>
                        
                        <Input
                            label="Dirección del Local (Ubicación)"
                            type="text"
                            value={settings.ticket_address || ''}
                            onChange={(e) => setSettings({ ...settings, ticket_address: e.target.value })}
                            placeholder="Ej: Av. Siempreviva 742, CABA"
                        />
                        
                        <div className="grid two-cols gap-sm">
                            <Input
                                label="CUIT"
                                type="text"
                                value={settings.ticket_cuit || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_cuit: e.target.value })}
                                placeholder="Ej: 20-12345678-9"
                            />
                            <Input
                                label="Ingresos Brutos (IIBB)"
                                type="text"
                                value={settings.ticket_iibb || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_iibb: e.target.value })}
                                placeholder="Ej: 123-45678-9"
                            />
                        </div>

                        <div className="grid three-cols gap-sm">
                            <Input
                                label="Condición de IVA"
                                type="text"
                                value={settings.ticket_iva || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_iva: e.target.value })}
                                placeholder="Ej: Responsable Inscripto"
                            />
                            <Input
                                label="Teléfono en Ticket"
                                type="text"
                                value={settings.ticket_phone || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_phone: e.target.value })}
                                placeholder="Ej: 11-5555-5555"
                            />
                            <Input
                                label="Email en Ticket"
                                type="email"
                                value={settings.ticket_email || ''}
                                onChange={(e) => setSettings({ ...settings, ticket_email: e.target.value })}
                                placeholder="Ej: contacto@tienda.com"
                            />
                        </div>

                        <label className="ui-field">
                            <span className="field-label">Pie de Página</span>
                            <div className="field-control">
                                <textarea
                                    className="textarea-control font-mono text-sm transition-colors"
                                    rows={3}
                                    value={settings.ticket_footer || ''}
                                    onChange={(e) => setSettings({ ...settings, ticket_footer: e.target.value })}
                                    placeholder="Mensaje de agradecimiento..."
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                        </label>
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
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '8px' }}>
                                    {logoDataUrl && (
                                        <img
                                            src={logoDataUrl}
                                            alt="Logo"
                                            style={{ maxHeight: '44px', maxWidth: '60px', objectFit: 'contain', flexShrink: 0 }}
                                        />
                                    )}
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        {settings.branch_name || 'TU NEGOCIO'}
                                    </div>
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
                                            <div style={{ fontWeight: 'bold' }}>CAMISA LINO</div>
                                            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                                                Precio: $82.500,00
                                                <span style={{ color: '#c2410c', fontWeight: 'bold', marginLeft: '6px' }}>(Desc. -$5.000,00)</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '4px 0', fontSize: '12px', verticalAlign: 'top' }}>1</td>
                                        <td style={{ textAlign: 'right', padding: '4px 0', fontSize: '12px', verticalAlign: 'top' }}>$77.500,00</td>
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
