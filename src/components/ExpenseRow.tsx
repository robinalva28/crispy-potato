import type { Expense } from '../types.ts';
import { getExpenseTotal, fmtARS, fmtUSD, fmtDate } from '../utils/money.ts';
import { Icon } from './ui/Icon.tsx';

interface Props {
  expense: Expense;
  onTogglePaid: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  onDuplicate: (id: number) => void;
  /** Abre el mini menú contextual de la fila (editar/clonar/eliminar). */
  onContextMenu?: (expense: Expense, e: React.MouseEvent<HTMLElement>) => void;
}

export function ExpenseRow({ expense, onTogglePaid, onDelete, onEdit, onDuplicate, onContextMenu }: Props) {
  const isPending = !expense.paid;
  const isEstimated = expense.amountArs == null;
  const hasUsd = expense.amountUsd > 0;
  const total = getExpenseTotal(expense);
  const amountText = isEstimated
    ? `~${fmtARS(expense.estimatedArs ?? 0)}`
    : fmtARS(expense.amountArs ?? 0);

  return (
    <div
      data-expense-id={expense.id}
      className={`relative flex items-center gap-3 rounded-2xl glass exp-card px-3 py-1.5 min-h-[46px] cursor-pointer hover:opacity-90 transition ${
        isPending ? 'opacity-70' : ''
      }`}
      onClick={(e) => {
        if (onContextMenu) {
          onContextMenu(expense, e);
        } else {
          onEdit(expense);
        }
      }}
    >
      {/* Anillo del efecto de recompensa (Snap + anillo, opción C): invisible hasta que la fila recibe .effC-exp */}
      <span className="exp-row-ring" aria-hidden />
      <button
        type="button"
        aria-label={expense.paid ? 'Marcar pendiente' : 'Marcar pagado'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePaid(expense.id!);
        }}
        className={`w-[36px] h-[36px] shrink-0 rounded-full flex items-center justify-center transition ${
          expense.paid
            ? 'grad-emerald text-white shadow-sm'
            : isEstimated
              ? 'border-2 border-dashed border-accent-violet bg-violet-100/30 dark:bg-violet-400/15 text-accent-violet'
              : 'border-2 border-accent-amber bg-amber-100/30 dark:bg-amber-400/15 text-accent-amber'
        }`}
      >
        <Icon
          name={expense.paid ? 'check' : isEstimated ? 'help' : 'clock'}
          size={16}
          strokeWidth={2.5}
          ariaHidden
        />
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-semibold truncate ${isPending ? 'opacity-60' : ''}`}>
          {expense.name}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] opacity-50 truncate">
          {fmtDate(expense.dueDate)}
          {expense.dueDate && <span>·</span>}
          {isEstimated && <span className="exp-tag exp-tag--est">Por confirmar</span>}
          {isPending && !isEstimated && <span className="exp-tag exp-tag--pend">Pendiente</span>}
          {!isPending && <span className="exp-tag exp-tag--paid">Pagado</span>}
        </div>
      </div>

      {/* Monto principal + resumen (USD y total) apilados a la derecha */}
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className={`text-[13px] font-bold whitespace-nowrap tabular-nums ${isPending ? 'opacity-60' : ''}`}>
          {amountText}
        </span>
        {hasUsd && (
          <span className="text-[10px] opacity-50 whitespace-nowrap tabular-nums">
            +{fmtUSD(expense.amountUsd)} · = {fmtARS(total, 0)}
          </span>
        )}
      </div>
    </div>
  );
}