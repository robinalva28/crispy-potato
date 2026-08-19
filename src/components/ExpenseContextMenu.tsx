import type { Expense } from '../types.ts';
import { getExpenseTotal, fmtARS, fmtUSD, fmtDate } from '../utils/money.ts';
import { Icon } from './ui/Icon.tsx';

export interface ExpenseRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  expense: Expense;
  rect: ExpenseRect;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function ExpenseContextMenu({ expense, rect, onEdit, onDuplicate, onDelete }: Props) {
  const isPending = !expense.paid;
  const isEstimated = expense.amountArs == null;
  const hasUsd = expense.amountUsd > 0;
  const total = getExpenseTotal(expense);
  const amountText = isEstimated
    ? `~${fmtARS(expense.estimatedArs ?? 0)}`
    : fmtARS(expense.amountArs ?? 0);

  // Menú: hacia abajo y pegado a la derecha de la card; si no entra, arriba
  const menuTop = rect.top + rect.height + 10;
  const menuLeft = Math.max(12, rect.left + rect.width - 220);
  const flipUp = menuTop + 190 > window.innerHeight;
  const top = flipUp ? Math.max(12, rect.top - 190) : menuTop;

  return (
    <>
      {/* Card fantasma nítida (encima del scrim blurreado) */}
      <div
        className="exp-ghost"
        style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
      >
        <div className={`flex items-center gap-3 px-3.5 py-3 ${isPending ? 'opacity-70' : ''}`}>
          <div
            className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${expense.paid ? 'grad-emerald text-white' : ''}`}
            style={
              expense.paid
                ? undefined
                : isEstimated
                  ? { border: '2px dashed var(--accent-violet)' }
                  : { border: '2px solid var(--accent-amber)' }
            }
          >
            {expense.paid && <Icon name="check" size={12} strokeWidth={3} ariaHidden />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline gap-2">
              <span className={`text-sm font-semibold truncate ${isPending ? 'opacity-60' : ''}`}>
                {expense.name}
              </span>
              <span className={`font-bold whitespace-nowrap tabular-nums ${isPending ? 'opacity-60' : ''}`}>
                {amountText}
              </span>
            </div>
            <div className="text-[11px] opacity-40 truncate">
              {fmtDate(expense.dueDate)}
              {expense.notes ? ' · ' : ''}
              {expense.notes}
            </div>
          </div>
          <div className="text-[11px] opacity-40 whitespace-nowrap tabular-nums">
            {hasUsd && <>+ {fmtUSD(expense.amountUsd)} a {fmtARS(expense.usdRate)} </>}
            <span className="opacity-60">= {fmtARS(total, 0)}</span>
          </div>
        </div>
      </div>

      {/* Menú flotante con las acciones */}
      <div className="exp-menu" style={{ top, left: menuLeft }}>
        <div className="exp-menu-title truncate">{expense.name}</div>
        <button type="button" className="em-item" onClick={onEdit}>
          <span className="ico"><Icon name="pencil" size={20} /></span>Editar
        </button>
        <button type="button" className="em-item" onClick={onDuplicate}>
          <span className="ico"><Icon name="copy" size={20} /></span>Clonar
        </button>
        <button type="button" className="em-item danger" onClick={onDelete}>
          <span className="ico"><Icon name="trash" size={20} /></span>Eliminar
        </button>
      </div>
    </>
  );
}