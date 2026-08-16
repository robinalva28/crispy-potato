import { fmtARS } from '../utils/money.ts';

interface Props {
  history: { monthId: string; savings: number }[];
}

function monthLabel(id: string): string {
  const [y, m] = id.split('-').map(Number);
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[m - 1] ?? ''} ${String(y).slice(2)}`;
}

/**
 * Gráfico de evolución del ahorro mensual (CSS puras, sin librerías).
 * Barras verticales: verde si el mes ahorró, rojo si quedó en negativo.
 * Altura proporcional al valor absoluto, con legendas al pasar el dedo.
 */
export function SavingsChart({ history }: Props) {
  if (history.length < 2) return null;

  const maxAbs = Math.max(...history.map((h) => Math.abs(h.savings)), 1);
  const maxBar = 80;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
        Evolución mensual
      </div>

      <div className="relative">
        <div className="absolute left-0 right-0 top-1/2 h-px bg-neutral-200 dark:bg-neutral-700" />

        <div className="relative flex items-end justify-between gap-1 h-24">
          {history.map((h) => {
            const abs = Math.min(Math.abs(h.savings) / maxAbs, 1);
            const height = Math.max(abs * maxBar, 3);
            const positive = h.savings >= 0;
            return (
              <div
                key={h.monthId}
                title={`${monthLabel(h.monthId)}: ${fmtARS(h.savings, 0)}`}
                className="group relative flex-1 flex justify-center"
              >
                <div
                  className={`w-full max-w-[28px] rounded-t ${positive ? 'bg-emerald-500' : 'bg-red-500'} opacity-80 group-hover:opacity-100 transition-opacity`}
                  style={{ height: `${height}px`, alignSelf: positive ? 'flex-end' : 'flex-start', marginTop: positive ? undefined : 'auto' }}
                />
                <div className="absolute -bottom-5 text-[9px] text-neutral-400 dark:text-neutral-500 truncate w-full text-center">
                  {monthLabel(h.monthId)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[10px] text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block" /> Ahorro
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-red-500 inline-block" /> En negativo
        </span>
      </div>
    </div>
  );
}