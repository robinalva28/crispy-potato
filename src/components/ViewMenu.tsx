import type { View } from '../types.ts';
import { Icon, type IconName } from './ui/Icon.tsx';

interface Props {
  open: boolean;
  view: View;
  onSelect: (view: View) => void;
}

const ITEMS: Array<{ view: View; icon: IconName; label: string }> = [
  { view: 'budget', icon: 'clipboard', label: 'Presupuesto' },
  { view: 'savings', icon: 'wallet', label: 'Ahorro' },
];

export function ViewMenu({ open, view, onSelect }: Props) {
  return (
    <div className={`view-menu ${open ? 'open' : ''}`}>
      {ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          className={`vm-item ${item.view === view ? 'on' : ''}`}
          onClick={() => onSelect(item.view)}
        >
          <Icon name={item.icon} size={20} />
          {item.label}
        </button>
      ))}
    </div>
  );
}