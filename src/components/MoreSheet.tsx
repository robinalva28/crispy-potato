import type { View } from '../types.ts';

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
  return (
    <div className={`sheet ${open ? 'open' : ''}`}>
      <div className="sheet-h"></div>
      <div className="sheet-title">Más opciones</div>

      <button type="button" className="sh-item" onClick={() => { onGroupBy(); onClose(); }}>
        <span className="ico">🗂</span>Agrupar por categoría
      </button>
      <button type="button" className="sh-item" onClick={() => { onBudgets(); onClose(); }}>
        <span className="ico">⚙</span>Presupuestos por categoría
      </button>

      {monthClosed ? (
        <button type="button" className="sh-item" onClick={() => { onReopenMonth(); onClose(); }}>
          <span className="ico">🔓</span>Reabrir mes
        </button>
      ) : (
        <button type="button" className="sh-item" onClick={() => { onCloseMonth(); onClose(); }}>
          <span className="ico">🔒</span>Cerrar mes
        </button>
      )}

      <button type="button" className="sh-item" onClick={() => { onGuide(); onClose(); }}>
        <span className="ico">❓</span>Guía de uso
      </button>

      <button type="button" className="sh-item" onClick={onToggleTheme}>
        <span className="ico">{dark ? '☀️' : '🌙'}</span>
        {dark ? 'Modo claro' : 'Modo oscuro'}
        <span className="trailing">{dark ? 'Oscuro' : 'Claro'}</span>
      </button>

      <button type="button" className="sh-item" onClick={() => { onToggleSound(); onClose(); }}>
        <span className="ico">🔊</span>Sonidos
        <span className="trailing">{soundEnabled ? 'Activados' : 'Silenciados'}</span>
      </button>

      <button type="button" className="sh-item" onClick={() => { onExport(); onClose(); }}>
        <span className="ico">📤</span>Exportar datos
      </button>

      <label className="sh-item cursor-pointer">
        <span className="ico">📥</span>Importar datos
        <span className="trailing" />
        <input type="file" accept="application/json" className="hidden" onChange={(e) => { onImport(e); onClose(); }} />
      </label>
    </div>
  );
}