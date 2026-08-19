import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  maxWidth?: string;
}

/** Modal base: overlay blur + panel glass estándar (mismo estilo en toda la app). */
export function Modal({ open, onClose, title, footer, children, maxWidth = 'max-w-sm' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className={`w-full ${maxWidth} glass-card rounded-3xl p-4 space-y-3`}>
        {title != null && (
          <div className="flex items-center justify-between gap-2">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">{title}</div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-7 h-7 rounded-full glass flex items-center justify-center text-sm hover:opacity-70 transition shrink-0"
            >
              ✕
            </button>
          </div>
        )}
        {children}
        {footer != null && <div className="flex gap-2 pt-1">{footer}</div>}
      </div>
    </div>
  );
}