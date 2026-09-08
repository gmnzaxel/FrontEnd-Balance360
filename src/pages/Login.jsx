import React, { useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Package,
  CheckCircle2,
  AlertCircle,
  Building2,
  MessageCircle,
  Mail,
  ExternalLink,
  HelpCircle,
  Barcode,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  FileSpreadsheet,
  Bell,
  Database,
} from 'lucide-react'
import { AuthContext } from '../context/AuthContext'
import BrandMark from '../components/ui/BrandMark'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'

const Login = () => {
  const [username, setUsername] = useState(() => localStorage.getItem('remembered_username') || '')
  const [rememberMe, setRememberMe] = useState(() => {
    const savedUsername = localStorage.getItem('remembered_username')
    const pref = localStorage.getItem('remember_me_pref')
    if (savedUsername) return true
    return pref === 'true'
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [supportModal, setSupportModal] = useState(null) // 'problemas' | 'crear_cuenta' | null

  const { login } = useContext(AuthContext)
  const navigate = useNavigate()

  const usernameInputRef = useRef(null)
  const passwordInputRef = useRef(null)

  useEffect(() => {
    if (username.trim()) {
      passwordInputRef.current?.focus()
    } else {
      usernameInputRef.current?.focus()
    }
  }, [])

  const handleUsernameChange = (e) => {
    const val = e.target.value
    setUsername(val)
    if (rememberMe) {
      if (val.trim()) {
        localStorage.setItem('remembered_username', val.trim())
      } else {
        localStorage.removeItem('remembered_username')
      }
    }
    setErrors((prev) => ({ ...prev, username: '', password: '' }))
  }

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked
    setRememberMe(checked)
    if (checked) {
      localStorage.setItem('remember_me_pref', 'true')
      if (username.trim()) {
        localStorage.setItem('remembered_username', username.trim())
      }
    } else {
      localStorage.setItem('remember_me_pref', 'false')
      localStorage.removeItem('remembered_username')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nextErrors = {}
    if (!username.trim()) nextErrors.username = 'Ingresá tu usuario.'
    if (!password) nextErrors.password = 'Ingresá tu contraseña.'
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      return
    }

    if (rememberMe) {
      localStorage.setItem('remembered_username', username.trim())
      localStorage.setItem('remember_me_pref', 'true')
    } else {
      localStorage.removeItem('remembered_username')
      localStorage.setItem('remember_me_pref', 'false')
    }

    setLoading(true)
    const loggedUser = await login(username.trim(), password)
    setLoading(false)

    if (loggedUser) {
      if (loggedUser.is_superuser && !localStorage.getItem('impersonated_company_id')) {
        navigate('/super-dashboard')
      } else {
        navigate('/')
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        password: 'Revisá tu usuario y contraseña. Si olvidaste tu clave, contactá al soporte técnico.',
      }))
    }
  }

  const supportWhatsAppUrl =
    supportModal === 'crear_cuenta'
      ? 'https://wa.me/5492604845564?text=' +
        encodeURIComponent(
          'Hola Soporte Balance360, quisiera solicitar la creación y alta de una cuenta de empresa.',
        )
      : 'https://wa.me/5492604845564?text=' +
        encodeURIComponent(
          'Hola Soporte Balance360, tengo problemas para ingresar a mi cuenta y necesito ayuda para restablecerla.',
        )

  const supportEmailUrl =
    supportModal === 'crear_cuenta'
      ? 'mailto:gimenezaaxel@gmail.com?subject=' +
        encodeURIComponent('Solicitud de Alta de Empresa - Balance360') +
        '&body=' +
        encodeURIComponent(
          'Hola,\n\nQuisiera solicitar la creación y alta de una cuenta de empresa en Balance360.\n\nNombre de la empresa:\nContacto:\nTeléfono:',
        )
      : 'mailto:gimenezaaxel@gmail.com?subject=' +
        encodeURIComponent('Problemas al ingresar - Balance360') +
        '&body=' +
        encodeURIComponent(
          `Hola,\n\nTengo problemas para ingresar a mi cuenta en Balance360.\nUsuario: ${username || '[indicar usuario]'}\nDetalle del inconveniente:`,
        )

  return (
    <div className="auth-shell-pro">
      {/* Background Architectural Grid, Atmospheric Beam & Ambient Lights */}
      <div className="auth-ambient-beam" aria-hidden="true" />
      <div className="auth-ambient-horizon" aria-hidden="true" />
      <div className="auth-ambient-grid" aria-hidden="true" />
      <div className="auth-ambient-noise" aria-hidden="true" />
      <div className="auth-ambient-glow-1" aria-hidden="true" />
      <div className="auth-ambient-glow-2" aria-hidden="true" />
      <div className="auth-ambient-glow-3" aria-hidden="true" />

      <div className="auth-layout-pro">
        {/* Left Enterprise Product Showcase */}
        <aside className="auth-showcase">
          {/* Header Brand & Enterprise Badge */}
          <div className="showcase-top">
            <div className="auth-brand">
              <div className="brand-icon">
                <BrandMark size={30} />
              </div>
              <div className="brand-text">
                <span>Balance</span>
                <strong>360</strong>
              </div>
            </div>
            <div className="showcase-version-badge">
              <span className="version-pulse"></span>
              <span>v2.4 Enterprise</span>
            </div>
          </div>

          {/* Hero Statement */}
          <div className="showcase-hero">
            <h1 className="showcase-headline">
              El sistema operativo comercial para{' '}
              <span className="text-gradient-obsidian">negocios modernos</span>.
            </h1>
            <p className="showcase-description">
              Control integral de ventas, inventario en tiempo real y reportes financieros con
              máxima velocidad y respaldo continuo.
            </p>
          </div>

          {/* Bento Showcase Cards */}
          <div className="bento-showcase-grid">
            {/* Card 1: POS & Cobros */}
            <div className="bento-card bento-card-pos">
              <div className="bento-card-top">
                <div className="bento-icon-wrapper pos-accent">
                  <Zap size={18} />
                </div>
                <div className="bento-header-info">
                  <div className="bento-title-row">
                    <span className="bento-title">Punto de Venta Ultra-Ágil</span>
                    <span className="bento-status-badge green">
                      <span className="bento-pulse-dot green" />
                      Terminal Activa
                    </span>
                  </div>
                  <span className="bento-subtitle">Facturación rápida, presupuestos y control de caja</span>
                </div>
              </div>

              <div className="bento-pos-preview">
                <div className="bento-scanner-tag">
                  <Barcode size={14} />
                  <span>Lector de código óptico activo</span>
                </div>
                <div className="bento-payment-pills">
                  <span className="bento-pill active"><CreditCard size={12} /> Tarjetas</span>
                  <span className="bento-pill active"><Banknote size={12} /> Efectivo</span>
                  <span className="bento-pill active"><ArrowRightLeft size={12} /> Transferencia</span>
                </div>
              </div>
            </div>

            {/* Card 2: Control de Inventario 360° */}
            <div className="bento-card bento-card-inventory">
              <div className="bento-card-top">
                <div className="bento-icon-wrapper inventory-accent">
                  <Package size={18} />
                </div>
                <div className="bento-header-info">
                  <div className="bento-title-row">
                    <span className="bento-title">Control de Inventario 360°</span>
                    <span className="bento-status-badge cyan">
                      <span className="bento-pulse-dot cyan" />
                      Stock al Día
                    </span>
                  </div>
                  <span className="bento-subtitle">Monitoreo de existencias y reposición inteligente</span>
                </div>
              </div>

              <div className="bento-inventory-preview">
                <div className="bento-scanner-tag cyan-tag">
                  <FileSpreadsheet size={14} />
                  <span>Importación masiva Excel / CSV</span>
                </div>
                <div className="bento-payment-pills">
                  <span className="bento-pill active"><Bell size={12} /> Alertas de reposición</span>
                  <span className="bento-pill active"><Package size={12} /> Catálogo en vivo</span>
                </div>
              </div>
            </div>

            {/* Card 3: Datos Protegidos & Nube */}
            <div className="bento-card bento-card-security">
              <div className="bento-card-top">
                <div className="bento-icon-wrapper security-accent">
                  <ShieldCheck size={18} />
                </div>
                <div className="bento-header-info">
                  <div className="bento-title-row">
                    <span className="bento-title">Tus datos 100% protegidos</span>
                    <span className="bento-status-badge purple">
                      <span className="bento-pulse-dot purple" />
                      Nube Segura
                    </span>
                  </div>
                  <span className="bento-subtitle">Copias de seguridad diarias y confidencialidad total</span>
                </div>
              </div>

              <div className="bento-security-preview">
                <div className="bento-sec-grid">
                  <div className="sec-chip">
                    <Database size={13} className="text-indigo-highlight" />
                    <span>Backups diarios: <strong>Automáticos</strong></span>
                  </div>
                  <div className="sec-chip">
                    <CheckCircle2 size={13} className="text-emerald-highlight" />
                    <span>Privacidad del negocio: <strong>Garantizada</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Pillars Footer */}
          <div className="showcase-trust-bar">
            <div className="trust-item">
              <CheckCircle2 size={14} className="text-primary-400" />
              <span>99.9% Disponibilidad</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={14} className="text-primary-400" />
              <span>Soporte Técnico Directo</span>
            </div>
            <div className="trust-item">
              <CheckCircle2 size={14} className="text-primary-400" />
              <span>Respaldo en la Nube</span>
            </div>
          </div>
        </aside>

        {/* Right Authentication Form Panel */}
        <div className="auth-panel-pro">
          <div className="auth-card-pro">
            {/* Top decorative accent line */}
            <div className="auth-card-accent-line" aria-hidden="true" />

            {/* Mobile Brand Header */}
            <div className="auth-mobile-header">
              <div className="brand-icon">
                <BrandMark size={28} />
              </div>
              <div>
                <span className="brand-title">
                  Balance<strong>360</strong>
                </span>
                <span className="brand-subtitle">Acceso al Sistema</span>
              </div>
            </div>

            <div className="auth-card-header">
              <h2 className="auth-title">Iniciar sesión</h2>
              <p className="auth-description">
                Ingresá tus credenciales para acceder a la plataforma.
              </p>
            </div>

            {errors.password && (
              <div className="auth-alert-error" role="alert">
                <AlertCircle size={17} className="flex-shrink-0" />
                <span>{errors.password}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form-stack" noValidate>
              <Input
                ref={usernameInputRef}
                label="Usuario"
                placeholder="ej: admin_ventas"
                value={username}
                onChange={handleUsernameChange}
                icon={<User size={18} />}
                autoComplete="username"
                error={errors.username}
                required
              />

              <Input
                ref={passwordInputRef}
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrors((prev) => ({ ...prev, password: '' }))
                }}
                icon={<Lock size={18} />}
                autoComplete="current-password"
                suffix={
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    tabIndex={-1}
                    title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                required
              />

              <div className="auth-form-extras">
                <label className="auth-remember-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={handleRememberMeChange}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-label">Recordar usuario</span>
                </label>

                <button
                  type="button"
                  onClick={() => setSupportModal('problemas')}
                  className="auth-help-btn"
                >
                  ¿Problemas al ingresar?
                </button>
              </div>

              <button
                type="submit"
                className="auth-submit-btn ui-btn ui-btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-loading-content">
                    <span className="auth-spinner"></span>
                    Iniciando sesión…
                  </span>
                ) : (
                  <span className="btn-content">
                    <span>Ingresar al sistema</span>
                    <ArrowRight size={18} />
                  </span>
                )}
              </button>

              {/* Support Account Creation CTA */}
              <div className="auth-register-box">
                <p className="register-prompt">¿No tenés una cuenta empresarial?</p>
                <button
                  type="button"
                  onClick={() => setSupportModal('crear_cuenta')}
                  className="auth-register-link"
                >
                  <Building2 size={16} />
                  <span>Crear cuenta de empresa</span>
                  <ArrowRight size={14} className="link-arrow" />
                </button>
              </div>

              {/* Security Badge Stamp */}
              <div className="auth-secure-stamp">
                <ShieldCheck size={14} />
                <span>Datos protegidos y respaldados automáticamente · Balance360</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Direct Support Modal */}
      {supportModal && (
        <Modal
          title={
            supportModal === 'crear_cuenta'
              ? 'Crear Cuenta de Empresa'
              : 'Soporte Técnico · Acceso'
          }
          onClose={() => setSupportModal(null)}
          size="md"
          className="auth-support-modal"
          overlayClassName="auth-support-modal-overlay"
        >
          <div className="support-modal-body">
            <p className="support-desc-text">
              {supportModal === 'crear_cuenta'
                ? 'Las cuentas de empresa en Balance360 se configuran a medida para cada negocio. Comunicate con soporte para dar de alta tu empresa de inmediato.'
                : '¿Olvidaste tu clave o tenés problemas con tu usuario? Nuestro equipo de soporte técnico te ayudará a restablecer el acceso a tu cuenta.'}
            </p>

            <div className="support-channels-list">
              <a
                href={supportWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="support-channel-card whatsapp"
              >
                <div className="support-channel-icon">
                  <MessageCircle size={22} />
                </div>
                <div className="support-channel-info">
                  <span className="support-channel-title">Contactar por WhatsApp</span>
                  <span className="support-channel-sub">+54 9 260 484-5564 · Atención directa</span>
                </div>
                <div className="support-channel-action">
                  <span>Abrir</span>
                  <ExternalLink size={13} />
                </div>
              </a>

              <a
                href={supportEmailUrl}
                className="support-channel-card email"
              >
                <div className="support-channel-icon">
                  <Mail size={22} />
                </div>
                <div className="support-channel-info">
                  <span className="support-channel-title">Enviar Correo Electrónico</span>
                  <span className="support-channel-sub">gimenezaaxel@gmail.com</span>
                </div>
                <div className="support-channel-action">
                  <span>Enviar</span>
                  <ArrowRight size={13} />
                </div>
              </a>
            </div>

            <div className="support-modal-footer-note">
              <HelpCircle size={14} />
              <span>Horario de atención: Lunes a Sábados de 8:00 a 20:00 hs.</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Login
