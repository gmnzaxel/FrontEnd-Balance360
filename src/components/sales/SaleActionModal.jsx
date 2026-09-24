import React from 'react'
import Modal from '../ui/Modal'

const SaleActionModal = ({
  actionType,
  onClose,
  confirmText,
  setConfirmText,
  reason,
  setReason,
  onSubmit,
  actionLoading,
}) => {
  if (!actionType) return null

  const isAnular = actionType === 'anular'

  return (
    <Modal
      title={isAnular ? 'Anular venta' : 'Reembolsar venta'}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={onSubmit}>
        <p className="text-sm text-muted mb-4">
          Para confirmar esta acción irreversible, escribí{' '}
          <strong>{isAnular ? 'borrar' : 'reembolsar'}</strong> en el campo de abajo.
        </p>
        <div className="form-group mb-4">
          <input
            className="input-control w-full"
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={isAnular ? 'borrar' : 'reembolsar'}
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
            onClick={onClose}
            disabled={actionLoading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className={`btn confirm-action ${isAnular ? 'confirm-danger' : 'confirm-warning'}`}
            style={{ width: 'auto', paddingLeft: '1rem', paddingRight: '1rem' }}
            disabled={actionLoading}
          >
            {actionLoading
              ? 'Procesando…'
              : isAnular
                ? 'Anular venta'
                : 'Reembolsar venta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default SaleActionModal
