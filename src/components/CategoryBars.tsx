import type { Category } from '../types.ts';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  fmtARS,
  categoryBudgetStatus,
} from '../utils/money.ts';

interface Props {
  totals: Map<Category, number>;
  budgets?: Partial<Record<Category, number>>;
}

const CATEGORY_COLORS: Record<Category, string> = {
  vivienda: 'bg-sky-500',
  tarjetas: 'bg-indigo-500',
  servicios: 'bg-amber-500',
  impuestos: 'bg-rose-500',
  salud: 'bg-emerald-500',
  eventos: 'bg-purple-500',
  otros: 'bg-neutral-400',
};

const STATUS_BAR: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  over: 'bg-red-500',
};

export function CategoryBars({ totals, budgets }: Props) {
  const total = [...totals.values()].reduce((s, v) => s + v, 0);
  if (total <= 0) return null;

  return (
    <div className="px-4 py-3 space-y-2 border-b border-neutral-200 dark:border-neutral-800">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Gastos por categoría
      </div>
      {CATEGORY_ORDER.filter((cat) => (totals.get(cat) ?? 0) > 0).map((cat) => {
        const value = totals.get(cat) ?? 0;
        const pct = (value / total) * 100;
        const budget = budgets?.[cat];
        const budgetInfo = categoryBudgetStatus(value, budget);
        return (
          <div key={cat}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-neutral-700 dark:text-neutral-300">{CATEGORY_LABELS[cat]}</span>
              <span className="text-neutral-500 dark:text-neutral-400">
                {fmtARS(value, 0)} · {Math.round(pct)}%
              </span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  budgetInfo ? STATUS_BAR[budgetInfo.status] : CATEGORY_COLORS[cat]
                }`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
            {budgetInfo && budget != null && (
              <div className="flex items-center justify-between mt-0.5 text-[10px]">
                <span
                  className={
                    budgetInfo.status === 'over'
                      ? 'text-red-600 font-semibold dark:text-red-400'
                      : budgetInfo.status === 'warn'
                        ? 'text-amber-600 font-medium dark:text-amber-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                  }
                >
                  {budgetInfo.status === 'over' ? 'Excedido ' : ''}
                  {Math.round(budgetInfo.pct * 100)}% del límite
                </span>
                <span className="text-neutral-400 dark:text-neutral-500">Límite {fmtARS(budget, 0)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
