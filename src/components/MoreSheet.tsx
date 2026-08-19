import { useRef, useState } from 'react';
import { Icon, type IconName } from './ui/Icon.tsx';

interface Props {
  open: boolean;
  dark: boolean;
  soundEnabled: boolean;
  monthClosed: boolean;
  onClose: () => void;
  onGroupBy: () => void;
  onBudgets: () => void;
  onReopenMonth: () => void;
  onCloseMonth: () => void;
  onGuide: () => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/** Distancia (px) a partir de la cual se cierra el sheet al soltar. */
const CLOSE_THRESHOLD = 90;
/** Máximo desplazamiento del sheet mientras se arrastra. */
const MAX_DRAG = 260;

export function MoreSheet({
  open,
  dark,
  soundEnabled,
  monthClosed,
  onClose,
  onGroupBy,
  onBudgets,
  onReopenMonth,
  onCloseMonth,
  onGuide,
  onToggleTheme,
  onToggleSound,
  onExport,
  onImport,
}: Props) {
  const [dragY, setDragY] = useState(0);
  const startYRef = useRef<number | null>(null);
  const dragYRef = useRef(0);

  /** Inicia el arrastre solo desde el handle de arriba. */
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!open) return;
    startYRef.current = e.clientY;
    dragYRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (startYRef.current == null) return;
    const delta = e.clientY - startYRef.current;
    const next = delta > 0 ? Math.min(delta, MAX_DRAG) : 0;
    dragYRef.current = next;
    setDragY(next);
  }

  function handlePointerUp() {
    if (startYRef.current == null) return;
    const shouldClose = dragYRef.current > CLOSE_THRESHOLD;
    startYRef.current = null;
    dragYRef.current = 0;
    setDragY(0);
    if (shouldClose) onClose();
  }

  return (
    <div
      className={`sheet ${open ? 'open' : ''} ${dragY > 0 ? 'dragging' : ''}`}
      style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
    >
      <div
        className="sheet-h"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="sheet-h-bar" />
      </div>
      <div className="sheet-title">Más opciones</div>

      <button type="button" className="sh-item" onClick={() => { onGroupBy(); onClose(); }}>
        <span className="ico"><Icon name="clipboard" size={20} /></span>Agrupar por categoría
      </button>
      <button type="button" className="sh-item" onClick={() => { onBudgets(); onClose(); }}>
        <span className="ico"><Icon name="settings" size={20} /></span>Presupuestos por categoría
      </button>

      {monthClosed ? (
        <button type="button" className="sh-item" onClick={() => { onReopenMonth(); onClose(); }}>
          <span className="ico"><Icon name="lockOpen" size={20} /></span>Reabrir mes
        </button>
      ) : (
        <button type="button" className="sh-item" onClick={() => { onCloseMonth(); onClose(); }}>
          <span className="ico"><Icon name="lock" size={20} /></span>Cerrar mes
        </button>
      )}

      <button type="button" className="sh-item" onClick={() => { onGuide(); onClose(); }}>
        <span className="ico"><Icon name="help" size={20} /></span>Guía de uso
      </button>

      <button type="button" className="sh-item" onClick={onToggleTheme}>
        <span className="ico"><Icon name={dark ? 'sun' : 'moon'} size={20} /></span>
        {dark ? 'Modo claro' : 'Modo oscuro'}
        <span className="trailing">{dark ? 'Oscuro' : 'Claro'}</span>
      </button>

      <button type="button" className="sh-item" onClick={() => { onToggleSound(); onClose(); }}>
        <span className="ico"><Icon name="volume" size={20} /></span>Sonidos
        <span className="trailing">{soundEnabled ? 'Activados' : 'Silenciados'}</span>
      </button>

      <button type="button" className="sh-item" onClick={() => { onExport(); onClose(); }}>
        <span className="ico"><Icon name="upload" size={20} /></span>Exportar datos
      </button>

      <label className="sh-item cursor-pointer">
        <span className="ico"><Icon name="download" size={20} /></span>Importar datos
        <span className="trailing" />
        <input type="file" accept="application/json" className="hidden" onChange={(e) => { onImport(e); onClose(); }} />
      </label>
    </div>
  );
}