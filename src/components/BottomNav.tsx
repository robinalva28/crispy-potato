import type { View } from '../types.ts';
import { Icon, type IconName } from './ui/Icon.tsx';

interface Props {
  view: View;
  onToggleView: () => void;
  onMore: () => void;
}

const VIEW_META: Record<View, { icon: IconName; label: string }> = {
  budget: { icon: 'clipboard', label: 'Presupuesto' },
  savings: { icon: 'wallet', label: 'Ahorro' },
};

export function BottomNav({ view, onToggleView, onMore }: Props) {
  const meta = VIEW_META[view];
  return (
    <nav className="bbar">
      <div className="bi">
        <button type="button" className="ni on" onClick={onToggleView} title="Cambiar vista">
          <Icon name={meta.icon} size={20} />
          <span>{meta.label}</span>
        </button>
        <button type="button" className="ni" onClick={onMore} title="Más opciones">
          <Icon name="more" size={20} />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}