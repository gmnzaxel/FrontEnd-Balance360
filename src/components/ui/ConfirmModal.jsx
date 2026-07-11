import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — reusable confirmation dialog that replaces window.confirm()
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onConfirm: () => void
 *  - title: string
 *  - message: string | ReactNode
 *  - confirmLabel: string  (default "Confirmar")
 *  - cancelLabel: string   (default "Cancelar")
 *  - variant: "danger" | "warning" | "primary"  (default "danger")
 *  - loading: boolean
 */
const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <Modal title={title} onClose={onClose} size="sm">
      <div className="confirm-modal-body">
        <div className="confirm-modal-icon" data-variant={variant}>
          <AlertTriangle size={24} />
        </div>
        <p className="confirm-modal-message">{message}</p>
      </div>
      <div className="confirm-modal-actions">
        <Button variant="ghost" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : variant === 'warning' ? 'warning' : 'primary'}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
