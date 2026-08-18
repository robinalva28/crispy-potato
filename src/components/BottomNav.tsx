import type { View } from '../types.ts';

interface Props {
  view: View;
  onToggleView: () => void;
  onMore: () => void;
}

const VIEW_META: Record<View, { ico: string; label: string }> = {
  budget: { ico: '📋', label: 'Presupuesto' },
  savings: { ico: '💰', label: 'Ahorro' },
};

export function BottomNav({ view, onToggleView, onMore }: Props) {
  const meta = VIEW_META[view];
  return (
    <nav className="bbar">
      <div className="bi">
        <button type="button" className="ni on" onClick={onToggleView} title="Cambiar vista">
          <span className="ico">{meta.ico}</span>
          <span>{meta.label}</span>
        </button>
        <button type="button" className="ni" onClick={onMore} title="Más opciones">
          <span className="ico">⋯</span>
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}