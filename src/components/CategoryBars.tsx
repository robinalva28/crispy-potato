import type { Category } from '../types.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER, fmtARS } from '../utils/money.ts';

interface Props {
  totals: Map<Category, number>;
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

export function CategoryBars({ totals }: Props) {
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
                className={`h-full rounded-full ${CATEGORY_COLORS[cat]}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}