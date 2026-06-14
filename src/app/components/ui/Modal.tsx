import React, { ReactNode } from 'react';
import { X } from '../../utils/icons';

interface ModalProps {
  title:    ReactNode;
  open:     boolean;
  onClose:  () => void;
  children: ReactNode;
  footer?:  ReactNode;
}

const Modal = ({ title, open, onClose, children, footer }: ModalProps) => {
  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
