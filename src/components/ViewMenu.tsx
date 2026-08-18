import type { View } from '../types.ts';

interface Props {
  open: boolean;
  view: View;
  onSelect: (view: View) => void;
}

const ITEMS: Array<{ view: View; ico: string; label: string }> = [
  { view: 'budget', ico: '📋', label: 'Presupuesto' },
  { view: 'savings', ico: '💰', label: 'Ahorro' },
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
          <span className="ico">{item.ico}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}