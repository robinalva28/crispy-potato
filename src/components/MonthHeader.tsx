import type { Month, Expense } from '../types.ts';
import {
  confirmedTotal,
  projectedTotal,
  remaining,
  paidTotal,
  unpaidTotal,
  fmtARS,
  fmtPct,
} from '../utils/money.ts';

interface Props {
  month: Month;
  expenses: Expense[];
  onEditMonth: () => void;
  dark: boolean;
  onToggleDark: () => void;
  isClosed: boolean;
}

export function MonthHeader({ month, expenses, onEditMonth, dark, onToggleDark, isClosed }: Props) {
  const confirmed = confirmedTotal(month.id, expenses);
  const projected = projectedTotal(month.id, expenses);
  const rest = remaining(month, expenses);
  const restPct = month.income > 0 ? rest / month.income : 0;
  const paid = paidTotal(month.id, expenses);
  const unpaid = unpaidTotal(month.id, expenses);
  const hasEstimated = expenses.some(
    (e) => e.monthId === month.id && e.amountArs == null && e.estimatedArs != null
  );

  return (
    <header className="px-4 pt-4 pb-3 border-b border-neutral-200">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-lg font-bold tracking-tight uppercase dark:text-neutral-50">
          {month.label}
          {isClosed && (
            <span className="ml-2 align-middle text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900">
              🔒 Cerrado
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-base border border-neutral-300 hover:bg-neutral-100 transition dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={onEditMonth}
            className="text-[11px] font-medium text-neutral-500 border border-neutral-300 rounded-md px-2 py-1 hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            ✎ Editar mes
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Ingreso: <span className="font-bold dark:text-neutral-100">{fmtARS(month.income)}</span>
        </span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm text-emerald-700 font-semibold dark:text-emerald-400">
          Resto proy.: {fmtARS(rest, 0)} ({fmtPct(restPct)})
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-neutral-50 rounded-lg px-2 py-2 dark:bg-neutral-800/60">
          <div className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium dark:text-neutral-400">Confirmado</div>
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{fmtARS(confirmed, 0)}</div>
        </div>
        <div className="bg-neutral-50 rounded-lg px-2 py-2 dark:bg-neutral-800/60">
          <div className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium dark:text-neutral-400">
            Proyectado{hasEstimated ? ' ~' : ''}
          </div>
          <div className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{fmtARS(projected, 0)}</div>
        </div>
        <div className="bg-emerald-50 rounded-lg px-2 py-2 dark:bg-emerald-950/40">
          <div className="text-[11px] text-emerald-700 uppercase tracking-wide font-medium dark:text-emerald-400">Resto</div>
          <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{fmtARS(rest, 0)}</div>
        </div>
      </div>

      {/* Desglose pagado vs pendiente */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-700 dark:text-emerald-400">✅ Pagado</span>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{fmtARS(paid, 0)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-600 dark:text-amber-400">⏳ Pendiente</span>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{fmtARS(unpaid, 0)}</span>
        </div>
        {projected > 0 && (
          <div className="flex h-1.5 bg-neutral-200 rounded-full overflow-hidden dark:bg-neutral-800">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min((paid / projected) * 100, 100)}%` }}
            />
            <div
              className="h-full bg-amber-400 transition-all"
              style={{ width: `${Math.min((unpaid / projected) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>
    </header>
  );
}