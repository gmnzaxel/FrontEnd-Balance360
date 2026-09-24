import React from 'react'
import { CreditCard, ShieldCheck, FileText, Printer, FileDown } from 'lucide-react'
import { toast } from 'react-toastify'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { formatARS } from '../../utils/format'
import arcaService from '../../services/arcaService'

const SaleSuccessModal = ({
  isOpen,
  onClose,
  lastSale,
  lastSaleWasEdit,
  onNewSale,
  onPrintTicket,
  onDownloadPDF,
  downloadingPDF,
  downloadingArcaPDF,
  setDownloadingArcaPDF,
}) => {
  if (!isOpen) return null

  const handleDownloadArcaInvoice = async () => {
    if (!lastSale?.id || !lastSale.electronic_invoice) return
    setDownloadingArcaPDF(true)
    try {
      await arcaService.downloadInvoicePdf(
        lastSale.id,
        `Factura_${lastSale.electronic_invoice.voucher_letter}_${lastSale.electronic_invoice.formatted_number}.pdf`,
      )
    } catch {
      toast.error('Error al generar PDF de la Factura ARCA')
    } finally {
      setDownloadingArcaPDF(false)
    }
  }

  return (
    <Modal
      title={lastSaleWasEdit ? 'Venta actualizada' : 'Venta registrada'}
      onClose={onClose}
      size="sm"
      footer={
        <Button variant="primary" fullWidth onClick={onNewSale}>
          Nueva venta
        </Button>
      }
    >
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
        >
          <CreditCard size={32} />
        </div>
        <h3 className="text-xl font-bold mb-2">¡Operación exitosa!</h3>
        <p className="text-muted mb-4">
          Venta #{lastSale?.sale_number || lastSale?.id} procesada por{' '}
          {formatARS(lastSale?.total || 0)}.
        </p>

        {/* Banner Fiscal ARCA si la venta tiene CAE */}
        {lastSale?.electronic_invoice && (
          <div
            className="mb-4 p-3 rounded-lg w-full text-left"
            style={{
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
            }}
          >
            <div className="flex items-center gap-xs text-primary-600 font-bold text-sm">
              <ShieldCheck size={18} />
              <span>Factura Electrónica ARCA Autorizada</span>
            </div>
            <div className="text-xs text-muted mt-1 flex flex-col gap-0.5">
              <span>
                <strong>Comprobante:</strong> {lastSale.electronic_invoice.voucher_name} #{lastSale.electronic_invoice.formatted_number}
              </span>
              <span>
                <strong>CAE:</strong> {lastSale.electronic_invoice.cae} (Vto: {lastSale.electronic_invoice.cae_due_date || '-'})
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-sm w-full">
          {/* Botón Principal para Facturas ARCA: Imprimir PDF Oficial A4 */}
          {lastSale?.electronic_invoice && (
            <Button
              variant="primary"
              fullWidth
              icon={<FileText size={18} />}
              onClick={handleDownloadArcaInvoice}
              disabled={downloadingArcaPDF}
            >
              {downloadingArcaPDF ? 'Abriendo Factura A4...' : 'Imprimir Factura Oficial A4 (ARCA)'}
            </Button>
          )}

          <Button
            variant="secondary"
            fullWidth
            icon={<Printer size={18} />}
            onClick={onPrintTicket}
          >
            Imprimir Ticket
          </Button>
          <Button
            variant="secondary"
            fullWidth
            icon={<FileDown size={18} />}
            onClick={onDownloadPDF}
            disabled={downloadingPDF}
          >
            {downloadingPDF ? 'Descargando...' : 'Descargar Comprobante PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SaleSuccessModal
