import React, { useEffect } from 'react';
import clsx from '../../utils/clsx';
import { X } from 'lucide-react';

const Modal = ({ title, children, onClose, size = 'md', footer, persist = false }) => {
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !persist) onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, persist]);

  return (
    <div className="modal-overlay" onClick={!persist ? onClose : undefined}>
      <div
        className={clsx('ui-modal', size === 'lg' && 'ui-modal-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3>{title}</h3>
          {!persist && (
            <button className="ghost-icon" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && (
          <div className="modal-foot">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
