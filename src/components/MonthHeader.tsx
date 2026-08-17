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
    <header>
      {/* Fila principal SIEMPRE visible: mes + resto + toggle + editar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-9 h-9 shrink-0 rounded-2xl flex items-center justify-center text-white text-sm"
            style={{ background: 'linear-gradient(135deg,#65a30d,#84cc16 55%,#10b981)', boxShadow: '0 8px 20px -8px rgba(132,204,22,.55)' }}
          >
            ✦
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold tracking-tight leading-tight truncate dark:text-neutral-50">
              {month.label}
              {isClosed && (
                <span className="ml-2 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100/80 border border-amber-200/60 rounded-full px-2 py-0.5 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900">
                  🔒 Cerrado
                </span>
              )}
            </h1>
            <div className="text-[11px] font-semibold tabular-nums" style={{ color: '#4d7c0f' }}>
              Resto: {fmtARS(rest, 0)} <span className="opacity-60">· {fmtPct(restPct)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="w-9 h-9 rounded-full glass flex items-center justify-center text-sm hover:scale-105 transition"
          >
            {dark ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            onClick={onEditMonth}
            className="text-[11px] font-semibold glass rounded-full px-3 py-2 hover:opacity-80 transition"
          >
            ✎ Mes
          </button>
        </div>
      </div>

      {/* Hero: Ingreso + Resto proyectado */}
      <div className="mt-3 space-y-3">
        <div
          className="rounded-3xl p-3.5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(132,204,22,.16), rgba(16,185,129,.12))', border: '1px solid rgba(132,204,22,.25)' }}
        >
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest opacity-50">
              Ingreso · Resto proyectado
            </div>
            <div className="text-lg font-bold tabular-nums tracking-tight mt-0.5">
              {fmtARS(month.income, 0)}
            </div>
            <div className="text-xs font-bold tabular-nums mt-0.5" style={{ color: '#4d7c0f' }}>
              <span className="opacity-70 font-medium">Resto: </span>{fmtARS(rest, 0)}
              <span className="text-xs font-semibold opacity-60"> ({fmtPct(restPct)})</span>
            </div>
          </div>
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{ background: 'linear-gradient(135deg,#65a30d,#84cc16)', boxShadow: '0 8px 20px -8px rgba(132,204,22,.55)' }}
          >
            🎯
          </div>
        </div>

        {/* Stats: Confirmado / Proyectado / Resto */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-2xl px-2 py-2.5">
            <div className="text-[9px] uppercase tracking-widest font-semibold opacity-50">Confirmado</div>
            <div className="text-[11px] font-extrabold tabular-nums mt-0.5">{fmtARS(confirmed, 0)}</div>
          </div>
          <div className="glass rounded-2xl px-2 py-2.5">
            <div className="text-[9px] uppercase tracking-widest font-semibold opacity-50">
              Proyectado{hasEstimated ? ' ~' : ''}
            </div>
            <div className="text-[11px] font-extrabold tabular-nums mt-0.5">{fmtARS(projected, 0)}</div>
          </div>
          <div
            className="rounded-2xl px-2 py-2.5"
            style={{ background: 'linear-gradient(135deg, rgba(132,204,22,.14), rgba(16,185,129,.10))', border: '1px solid rgba(132,204,22,.22)' }}
          >
            <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#4d7c0f' }}>Resto</div>
            <div className="text-[11px] font-extrabold tabular-nums mt-0.5" style={{ color: '#4d7c0f' }}>{fmtARS(rest, 0)}</div>
          </div>
        </div>

        {/* Desglose pagado vs pendiente: UNA SOLA LÍNEA */}
        {projected > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="opacity-50 font-medium">Pagado</span>
                <span className="font-bold tabular-nums opacity-80">{fmtARS(paid, 0)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                <span className="opacity-50 font-medium">Pendiente</span>
                <span className="font-bold tabular-nums opacity-80">{fmtARS(unpaid, 0)}</span>
              </div>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/60 dark:bg-white/10">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${Math.min((paid / projected) * 100, 100)}%` }}
              />
              <div
                className="h-full bg-amber-400 transition-all"
                style={{ width: `${Math.min((unpaid / projected) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}