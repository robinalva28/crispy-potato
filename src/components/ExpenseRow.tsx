import type { Expense } from '../types.ts';
import { getExpenseTotal, fmtARS, fmtNumber, fmtDate } from '../utils/money.ts';

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
      className={`px-3 py-2 flex items-center gap-2 ${
        isPending ? 'bg-amber-50/70 dark:bg-amber-950/20' : 'bg-white dark:bg-neutral-900'
      } border-b border-neutral-100 last:border-b-0 cursor-pointer dark:border-neutral-800`}
      onClick={() => onEdit(expense)}
    >
      <button
        type="button"
        aria-label={expense.paid ? 'Marcar pendiente' : 'Marcar pagado'}
        onClick={(e) => {
          e.stopPropagation();
          onTogglePaid(expense.id!);
        }}
        className={`w-5 h-5 shrink-0 rounded border flex items-center justify-center text-[11px] leading-none transition ${
          expense.paid
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-neutral-300 text-transparent dark:border-neutral-600'
        }`}
      >
        ✓
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className={`text-sm font-medium truncate ${isPending ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
            {expense.name}
          </span>
          <span className={`font-semibold whitespace-nowrap ${isPending ? 'text-neutral-500 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
            {amountText}
          </span>
        </div>
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-[11px] text-neutral-400 truncate dark:text-neutral-500">
            {fmtDate(expense.dueDate)}
            {expense.dueDate ? ' · ' : ''}
            {isEstimated && (
              <span className="text-amber-600 font-medium dark:text-amber-400">por confirmar</span>
            )}
            {isPending && !isEstimated && (
              <span className="text-amber-600 font-medium dark:text-amber-400">pendiente</span>
            )}
            {expense.notes && !isEstimated && (
              <span className="text-neutral-400 dark:text-neutral-500">{expense.notes}</span>
            )}
          </span>
          <span className="text-[11px] text-neutral-400 whitespace-nowrap dark:text-neutral-500">
            {hasUsd && (
              <>
                + US${fmtNumber(expense.amountUsd)} a {fmtARS(expense.usdRate)}
              </>
            )}
            {hasUsd && <span className="text-neutral-300 dark:text-neutral-700 mx-1">·</span>}
            <span className="text-neutral-500 dark:text-neutral-400">= {fmtARS(total, 0)}</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          aria-label="Duplicar gasto"
          title="Duplicar gasto"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(expense.id!);
          }}
          className="text-neutral-300 hover:text-emerald-500 text-sm dark:text-neutral-600 dark:hover:text-emerald-400"
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
          className="text-neutral-300 hover:text-red-500 text-sm dark:text-neutral-600 dark:hover:text-red-400"
        >
          ✕
        </button>
      </div>
    </div>
  );
}