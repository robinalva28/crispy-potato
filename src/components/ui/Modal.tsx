import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon.tsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
  /** Ícono del badge del header (contexto: violeta por defecto, danger/success según rol). */
  icon?: IconName;
  /** Rol del badge: danger (destructivo), success (lime), por defecto violeta. */
  danger?: boolean;
}

/**
 * Modal estándar (D27): panel 100% opaco (--panel-solid) + header con badge/título/✕
 * + cuerpo + footer de acciones. Reemplaza al glass-card translúcido.
 * Es la ÚNICA superficie de modales de la app.
 */
export function Modal({ open, onClose, title, footer, children, maxWidth = 'max-w-sm', icon, danger }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className={`w-full ${maxWidth} modal-panel overflow-hidden`}>
        {(title != null || icon != null) && (
          <div className="form-head pt-4">
            {icon != null && (
              <div className={`form-badge ${danger ? 'danger' : ''}`}>
                <Icon name={icon} size={16} />
              </div>
            )}
            <div className="form-title">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="form-x"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        )}
        <div className="form-body">{children}</div>
        {footer != null && <div className="form-foot">{footer}</div>}
      </div>
    </div>
  );
}