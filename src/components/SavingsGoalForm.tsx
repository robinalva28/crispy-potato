import { useState } from 'react';
import type { ExtraIncome, Month, Expense, SavingsGoal } from '../types.ts';
import { projectSavings } from '../utils/savings.ts';
import { fmtARS } from '../utils/money.ts';

interface Props {
  initial: SavingsGoal | null;
  months: Month[];
  expenses: Expense[];
  onSave: (data: Omit<SavingsGoal, 'id'>) => void;
  onCancel: () => void;
}

const MONTH_OPTIONS: string[] = (() => {
  const opts: string[] = [];
  const now = new Date();
  const startY = now.getFullYear();
  const startM = now.getMonth() + 1;
  for (let i = 0; i < 18; i++) {
    const y = startY + Math.floor((startM - 1 + i) / 12);
    const m = ((startM - 1 + i) % 12) + 1;
    opts.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return opts;
})();

function defaultStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function defaultEnd(): string {
  const now = new Date();
  now.setMonth(now.getMonth() + 5); // 6 meses incluido el actual
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function SavingsGoalForm({ initial, months, expenses, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startMonth, setStartMonth] = useState(initial?.startMonth ?? defaultStart());
  const [endMonth, setEndMonth] = useState(initial?.endMonth ?? defaultEnd());
  const [extras, setExtras] = useState<ExtraIncome[]>(initial?.extraIncomes ?? []);

  // Estado del form de agregar ingreso extra
  const [extraLabel, setExtraLabel] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraMonth, setExtraMonth] = useState(defaultStart());

  function addExtra() {
    const amount = Number(extraAmount);
    if (!extraLabel.trim() || !isFinite(amount) || amount <= 0) return;
    setExtras((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: extraLabel.trim(), amount, month: extraMonth },
    ]);
    setExtraLabel('');
    setExtraAmount('');
  }

  function totalPreview(): number {
    const preview: SavingsGoal = { name, startMonth, endMonth, extraIncomes: extras };
    // Misma lógica que la tarjeta: usa el último mes cerrado como referencia para meses sin data
    return projectSavings(preview, months, expenses).total;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startMonth || !endMonth) return;
    if (startMonth > endMonth) return;
    onSave({ name: name.trim(), startMonth, endMonth, extraIncomes: extras });
  }

  const inputCls =
    'w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100';
  const labelCls = 'block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400';

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div className="font-semibold text-sm text-neutral-700 dark:text-neutral-200">
        {initial ? 'Editar segmento de ahorro' : 'Nuevo segmento de ahorro'}
      </div>

      <div>
        <label className={labelCls}>Nombre del segmento *</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Auto, Vacaciones, Fondo emergencia"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Desde</label>
          <select className={inputCls} value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Hasta</label>
          <select className={inputCls} value={endMonth} onChange={(e) => setEndMonth(e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ingresos extra */}
      <div>
        <div className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1">
          Ingresos extra previstos (bono, aguinaldo, venta...)
        </div>
        <div className="space-y-1.5 mb-2">
          {extras.length === 0 && (
            <div className="text-xs text-neutral-400">Sin ingresos extra.</div>
          )}
          {extras.map((extra) => (
            <div key={extra.id} className="flex items-center justify-between gap-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md px-2 py-1.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate dark:text-neutral-100">{extra.label}</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{extra.month} · {fmtARS(extra.amount, 0)}</div>
              </div>
              <button
                type="button"
                aria-label="Quitar ingreso extra"
                onClick={() => setExtras((prev) => prev.filter((e) => e.id !== extra.id))}
                className="text-neutral-300 hover:text-red-500 text-sm shrink-0 dark:text-neutral-600 dark:hover:text-red-400"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <input
            className={inputCls}
            value={extraLabel}
            onChange={(e) => setExtraLabel(e.target.value)}
            placeholder="Bono fin de año"
          />
          <input
            className={inputCls}
            value={extraAmount}
            onChange={(e) => setExtraAmount(e.target.value)}
            placeholder="1.500.000"
            inputMode="decimal"
          />
          <div className="flex gap-1">
            <select className={inputCls} value={extraMonth} onChange={(e) => setExtraMonth(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addExtra}
              className="px-2 py-1.5 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition shrink-0"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase">Ahorro proyectado</span>
        <span className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{fmtARS(totalPreview(), 0)}</span>
      </div>

      {startMonth > endMonth && (
        <p className="text-xs text-red-500">"Desde" debe ser anterior o igual a "Hasta".</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={!name.trim() || startMonth > endMonth}
          className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-40"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}