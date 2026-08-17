import type { Expense } from '../types.ts';
import { getExpenseTotal, fmtARS, fmtUSD, fmtDate } from '../utils/money.ts';

interface Props {
  expense: Expense;
  onTogglePaid: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
  onDuplicate: (id: number) => void;
}

export function ExpenseRow({ expense, onTogglePaid, onDelete, onEdit, onDuplicate }: Props) {
  const isPending = !expense.paid;
  const isEstimated = expense.amountArs == null;
  const hasUsd = expense.amountUsd > 0;
  const total = getExpenseTotal(expense);
  const amountText = isEstimated
    ? `~${fmtARS(expense.estimatedArs ?? 0)}`
    : fmtARS(expense.amountArs ?? 0);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl glass px-3.5 py-3 cursor-pointer hover:opacity-90 transition ${
        isPending ? 'opacity-70' : ''
      }`}
      onClick={() => onEdit(expense)}
    >
      <button
        type="button"
        aria-label={expense.paid ? 'Marcar pendiente' : 'Marcar pagado'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePaid(expense.id!);
        }}
        className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] leading-none transition ${
          expense.paid
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-sm shadow-emerald-500/30'
            : isEstimated
              ? 'border-2 border-dashed border-violet-400 bg-violet-100/30'
              : 'border-2 border-amber-400/70 bg-amber-100/30'
        }`}
      >
        {expense.paid && '✓'}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className={`text-sm font-semibold truncate ${isPending ? 'opacity-60' : ''}`}>
            {expense.name}
          </span>
          <span className={`font-bold whitespace-nowrap tabular-nums ${isPending ? 'opacity-60' : ''}`}>
            {amountText}
          </span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-[11px] opacity-40 truncate">
            {fmtDate(expense.dueDate)}
            {expense.dueDate ? ' · ' : ''}
            {isEstimated && (
              <span className="text-violet-600 font-semibold dark:text-violet-400">por confirmar</span>
            )}
            {isPending && !isEstimated && (
              <span className="text-amber-600 font-semibold dark:text-amber-400">pendiente</span>
            )}
            {expense.notes && !isEstimated && (
              <span>{expense.notes}</span>
            )}
          </span>
          <span className="text-[11px] opacity-40 whitespace-nowrap tabular-nums">
            {hasUsd && (
              <>
                + {fmtUSD(expense.amountUsd)} a {fmtARS(expense.usdRate)}
              </>
            )}
            {hasUsd && <span className="opacity-30 mx-1">·</span>}
            <span className="opacity-60">= {fmtARS(total, 0)}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          aria-label="Duplicar gasto"
          title="Duplicar gasto"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(expense.id!);
          }}
          className="text-neutral-300 hover:text-lime-500 text-sm transition dark:text-neutral-600 dark:hover:text-lime-400"
        >
          ⧉
        </button>
        <button
          type="button"
          aria-label="Borrar gasto"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(expense.id!);
          }}
          className="text-neutral-300 hover:text-red-500 text-sm transition dark:text-neutral-600 dark:hover:text-red-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}