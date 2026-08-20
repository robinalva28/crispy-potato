import type { View } from '../types.ts';
import { Icon } from './ui/Icon.tsx';

interface Props {
  view: View;
  /** Acceso directo a la vista Presupuesto. */
  onBudget: () => void;
  onMore: () => void;
  /** Acceso directo a la vista Ahorro sin pasar por el mini menú. */
  onSavings: () => void;
  /** Abre el buscador. */
  onSearch: () => void;
}

export function BottomNav({ view, onBudget, onMore, onSavings, onSearch }: Props) {
  return (
    <nav className="bbar">
      <div className="bi">
        <div className="flex items-center justify-start gap-1 flex-1">
          <button
            type="button"
            className={`ni ${view === 'budget' ? 'on' : ''}`}
            onClick={onBudget}
            title="Presupuesto"
          >
            <Icon name="clipboard" size={18} />
            <span>Presupuesto</span>
          </button>
          <button
            type="button"
            className={`ni ${view === 'savings' ? 'on' : ''}`}
            onClick={onSavings}
            title="Ahorro"
          >
            <Icon name="wallet" size={18} />
            <span>Ahorro</span>
          </button>
        </div>
        <div className="mid" aria-hidden />
        <div className="flex items-center justify-end gap-1 flex-1">
          <button type="button" className="ni" onClick={onSearch} title="Buscar gasto">
            <Icon name="search" size={18} />
            <span>Buscar</span>
          </button>
          <button type="button" className="ni" onClick={onMore} title="Más opciones">
            <Icon name="more" size={18} />
            <span>Más</span>
          </button>
        </div>
      </div>
    </nav>
  );
}