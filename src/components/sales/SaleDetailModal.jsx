import React, { useState } from 'react'
import {
  FileText,
  FileDown,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Edit,
} from 'lucide-react'
import Modal from '../ui/Modal'

const SaleDetailModal = ({
  selectedSale,
  onClose,
  isMobile,
  isAdmin,
  hasActions,
  downloadingPDF,
  handleDownloadOfficialArcaPDF,
  handleDownloadTicketPDF,
  handlePrintTicket,
  setShowActionModal,
  handleAuthorizeArcaRetroactive,
  canEditSale,
  handleEditSale,
  handleHardDelete,
  setHoveredProduct,
  setMousePos,
  formatDate,
  formatCurrency,
}) => {
  const [showAdminMenu, setShowAdminMenu] = useState(false)

  if (!selectedSale) return null

  return (
    <Modal
      title={`Detalle de venta #${selectedSale.sale_number || selectedSale.id}`}
      onClose={onClose}
      size="lg"
      className="sale-detail-modal-container"
      footer={
        isMobile ? (
          <div className="sale-detail-foot-mobile">
            <div className="sale-detail-foot-row">
              {selectedSale.electronic_invoice?.status === 'APPROVED' && (
                <button
                  onClick={() => handleDownloadOfficialArcaPDF(selectedSale)}
                  className="ui-btn ui-btn-primary"
                >
                  <FileText size={14} /> Factura A4
                </button>
              )}
              <button
                onClick={() => handleDownloadTicketPDF(selectedSale)}
                className="ui-btn ui-btn-secondary"
                disabled={downloadingPDF}
              >
                <FileDown size={14} /> PDF
              </button>
              <button
                onClick={() => handlePrintTicket(selectedSale)}
                className="ui-btn ui-btn-secondary"
              >
                <Printer size={14} /> Ticket
              </button>
            </div>

            <div className="sale-detail-foot-row">
              {hasActions && (
                <div className="sale-detail-admin-wrapper">
                  <button
                    onClick={() => setShowAdminMenu(!showAdminMenu)}
                    className="ui-btn ui-btn-secondary sale-admin-toggle-btn"
                  >
                    <span>Acciones</span>
                    <span style={{ fontSize: '0.65rem' }}>▼</span>
                  </button>
                  {showAdminMenu && (
                    <div className="sale-admin-dropdown-menu">
                      {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                        <button
                          onClick={() => {
                            setShowActionModal('reembolsar')
                            setShowAdminMenu(false)
                          }}
                          className="sale-admin-item text-warning"
                        >
                          <RotateCcw size={14} /> Reembolsar venta
                        </button>
                      )}
                      {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && !selectedSale.electronic_invoice && (
                        <button
                          onClick={() => {
                            handleAuthorizeArcaRetroactive(selectedSale)
                            setShowAdminMenu(false)
                          }}
                          className="sale-admin-item"
                          style={{ color: '#2563eb' }}
                        >
                          <ShieldCheck size={14} /> Facturar en ARCA
                        </button>
                      )}
                      {/* Anulación o Nota de Crédito */}
                      {!selectedSale.is_voided &&
                        !selectedSale.is_refunded &&
                        (selectedSale.electronic_invoice?.status === 'APPROVED'
                          ? isAdmin
                          : isAdmin || canEditSale(selectedSale)) && (
                          <button
                            onClick={() => {
                              setShowActionModal('anular')
                              setShowAdminMenu(false)
                            }}
                            className="sale-admin-item text-danger"
                          >
                            <Trash2 size={14} />{' '}
                            {selectedSale.electronic_invoice?.status === 'APPROVED'
                              ? 'Emitir Nota de Crédito ARCA'
                              : 'Anular venta'}
                          </button>
                        )}

                      {/* Editar venta (Solo permitido si no es fiscal) */}
                      {canEditSale(selectedSale) && (
                        <button
                          onClick={() => {
                            handleEditSale(selectedSale)
                            setShowAdminMenu(false)
                          }}
                          className="sale-admin-item"
                        >
                          <Edit size={14} /> Editar venta
                        </button>
                      )}
                      {isAdmin && selectedSale.is_voided && (
                        <button
                          onClick={() => {
                            handleHardDelete()
                            setShowAdminMenu(false)
                          }}
                          className="sale-admin-item text-danger"
                        >
                          <Trash2 size={14} /> Eliminar venta
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button
                className="ui-btn ui-btn-primary sale-detail-close-btn"
                onClick={onClose}
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
              gap: '8px',
            }}
          >
            {/* Actions Dropdown for Desktop */}
            {hasActions ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowAdminMenu(!showAdminMenu)}
                  className="ui-btn ui-btn-secondary"
                  style={{
                    height: '34px',
                    minHeight: '34px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    gap: '6px',
                  }}
                >
                  <span>Acciones</span>
                  <span style={{ fontSize: '0.65rem' }}>▼</span>
                </button>
                {showAdminMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 0,
                      marginBottom: '6px',
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-lg)',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      zIndex: 100,
                      minWidth: '160px',
                    }}
                  >
                    {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && (
                      <button
                        onClick={() => {
                          setShowActionModal('reembolsar')
                          setShowAdminMenu(false)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-hover)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--warning-text)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          transition: 'background 0.15s',
                        }}
                      >
                        <RotateCcw size={14} /> Reembolsar
                      </button>
                    )}
                    {isAdmin && !selectedSale.is_voided && !selectedSale.is_refunded && !selectedSale.electronic_invoice && (
                      <button
                        onClick={() => {
                          handleAuthorizeArcaRetroactive(selectedSale)
                          setShowAdminMenu(false)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-hover)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          color: '#2563eb',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          transition: 'background 0.15s',
                        }}
                      >
                        <ShieldCheck size={14} /> Facturar en ARCA
                      </button>
                    )}
                    {/* Anulación o Nota de Crédito */}
                    {!selectedSale.is_voided &&
                      !selectedSale.is_refunded &&
                      (selectedSale.electronic_invoice?.status === 'APPROVED'
                        ? isAdmin
                        : isAdmin || canEditSale(selectedSale)) && (
                        <button
                          onClick={() => {
                            setShowActionModal('anular')
                            setShowAdminMenu(false)
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background = 'var(--surface-hover)')
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background = 'transparent')
                          }
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--danger-text)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            textAlign: 'left',
                            borderRadius: '6px',
                            fontWeight: 'bold',
                            transition: 'background 0.15s',
                          }}
                        >
                          <Trash2 size={14} />{' '}
                          {selectedSale.electronic_invoice?.status === 'APPROVED'
                            ? 'Emitir Nota de Crédito ARCA'
                            : 'Anular'}
                        </button>
                      )}

                    {/* Editar venta (Solo permitido si no es fiscal) */}
                    {canEditSale(selectedSale) && (
                      <button
                        onClick={() => {
                          handleEditSale(selectedSale)
                          setShowAdminMenu(false)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-hover)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = 'transparent')
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-primary)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          transition: 'background 0.15s',
                        }}
                      >
                        <Edit size={14} /> Editar
                      </button>
                    )}
                    {isAdmin && selectedSale.is_voided && (
                      <button
                        onClick={() => {
                          handleHardDelete()
                          setShowAdminMenu(false)
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = 'var(--surface-hover)')
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--danger-text)',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          transition: 'background 0.15s',
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div />
            )}

            {/* Secondary Output Actions & Close for Desktop */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '6px',
                alignItems: 'center',
              }}
            >
              {selectedSale.electronic_invoice?.status === 'APPROVED' && (
                <button
                  onClick={() => handleDownloadOfficialArcaPDF(selectedSale)}
                  className="ui-btn ui-btn-primary"
                  style={{
                    height: '34px',
                    minHeight: '34px',
                    padding: '6px 12px',
                    fontSize: '0.8rem',
                    gap: '6px',
                  }}
                >
                  <FileText size={14} /> Factura Oficial A4
                </button>
              )}
              <button
                onClick={() => handleDownloadTicketPDF(selectedSale)}
                className="ui-btn ui-btn-secondary"
                disabled={downloadingPDF}
                style={{
                  height: '34px',
                  minHeight: '34px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  gap: '6px',
                }}
              >
                <FileDown size={14} /> PDF
              </button>
              <button
                onClick={() => handlePrintTicket(selectedSale)}
                className="ui-btn ui-btn-secondary"
                style={{
                  height: '34px',
                  minHeight: '34px',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  gap: '6px',
                }}
              >
                <Printer size={14} /> Ticket
              </button>
              <button
                className="ui-btn ui-btn-primary"
                onClick={onClose}
                style={{
                  height: '34px',
                  minHeight: '34px',
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="sale-detail-modal stack gap-md">
        {/* Banner Fiscal ARCA si la venta está autorizada */}
        {selectedSale.electronic_invoice?.status === 'APPROVED' && (
          <div
            className="p-3 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-sm"
            style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div>
              <div className="flex items-center gap-xs text-primary-600 font-bold text-sm">
                <ShieldCheck size={18} />
                <span>Factura Electrónica ARCA: {selectedSale.electronic_invoice.voucher_name} #{selectedSale.electronic_invoice.formatted_number}</span>
              </div>
              <div className="text-xs text-muted mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong>CAE:</strong> {selectedSale.electronic_invoice.cae}</span>
                <span><strong>Vto. CAE:</strong> {selectedSale.electronic_invoice.cae_due_date || '-'}</span>
                <span><strong>Cliente:</strong> {selectedSale.customer_name || 'Consumidor Final'} {selectedSale.customer_doc_number ? `(${selectedSale.customer_doc_number})` : ''}</span>
              </div>
            </div>
            <button
              className="ui-btn ui-btn-sm ui-btn-primary"
              onClick={() => handleDownloadOfficialArcaPDF(selectedSale)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <FileText size={14} /> Imprimir A4
            </button>
          </div>
        )}

        {/* Summary Header */}
        <div
          className="sale-detail-summary grid four-cols gap-md p-md"
          style={{
            background: 'var(--surface-muted)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="stack gap-xs">
            <span className="eyebrow">Fecha</span>
            <span className="font-medium">{formatDate(selectedSale.date)}</span>
          </div>
          <div className="stack gap-xs">
            <span className="eyebrow">Vendedor</span>
            <div className="flex-row gap-xs items-center">
              <div className="avatar" style={{ width: 24, height: 24, fontSize: '0.7rem' }}>
                {selectedSale.user_name?.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium">{selectedSale.user_name}</span>
            </div>
          </div>
          <div className="stack gap-xs">
            <span className="eyebrow">Método</span>
            {selectedSale.payment_method === 'MIXTO' && selectedSale.payment_details ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span
                  className="badge badge-primary"
                  style={{ alignSelf: 'flex-start', fontSize: '0.72rem' }}
                >
                  Pago Dividido
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  • {selectedSale.payment_details.method_1}: $
                  {Number(selectedSale.payment_details.amount_1 || 0).toLocaleString('es-AR')}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  • {selectedSale.payment_details.method_2}: $
                  {Number(selectedSale.payment_details.amount_2 || 0).toLocaleString('es-AR')}
                </span>
              </div>
            ) : (
              <span className="font-medium">{selectedSale.payment_method}</span>
            )}
          </div>
          <div className="stack gap-xs">
            <span className="eyebrow">Estado</span>
            <div>
              {selectedSale.is_voided ? (
                <span className="badge badge-danger">ANULADA</span>
              ) : selectedSale.is_refunded ? (
                <span className="badge badge-warning">REEMBOLSADA</span>
              ) : (
                <span className="badge badge-success">COMPLETADA</span>
              )}
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
                <th style={{ textAlign: 'right' }}>Precio Unit.</th>
                <th style={{ textAlign: 'right' }}>Imp. Bonif.</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {selectedSale.items.map((item) => {
                const itemLabel =
                  item.item_type === 'SERVICIO'
                    ? item.description || 'Servicio'
                    : item.producto_nombre || 'Producto'
                const itemDiscount = parseFloat(item.discount) || 0
                return (
                  <tr
                    key={item.id}
                    onMouseEnter={() => {
                      if (item.producto_imagen_base64) {
                        setHoveredProduct({
                          nombre: itemLabel,
                          imagen_base64: item.producto_imagen_base64,
                        })
                      }
                    }}
                    onMouseLeave={() => setHoveredProduct(null)}
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                  >
                    <td data-label="Producto">
                      {itemLabel}
                    </td>
                    <td style={{ textAlign: 'right' }} data-label="Cant.">
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: 'right' }} data-label="Precio Unit.">
                      {formatCurrency(parseFloat(item.price) || 0)}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        color: itemDiscount > 0 ? 'var(--warning-text, #f59e0b)' : 'var(--text-muted)',
                      }}
                      data-label="Imp. Bonif."
                    >
                      {itemDiscount > 0 ? `-${formatCurrency(itemDiscount)}` : '$ 0,00'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }} data-label="Total">
                      {formatCurrency(
                        (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0) -
                          itemDiscount,
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div
          className="flex-col items-end gap-xs pt-sm"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {parseFloat(selectedSale.discount) > 0 && (
            <div className="flex-row gap-lg text-sm text-danger-text">
              <span>Bonif. General:</span>
              <span>- {formatCurrency(selectedSale.discount)}</span>
            </div>
          )}
          <div className="flex-row gap-lg text-lg font-bold">
            <span>Total:</span>
            <span>{formatCurrency(selectedSale.total)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default SaleDetailModal
