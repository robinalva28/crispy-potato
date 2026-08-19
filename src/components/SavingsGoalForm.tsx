import { useState } from 'react';
import type { ExtraIncome, Month, Expense, SavingsGoal } from '../types.ts';
import { projectSavings } from '../utils/savings.ts';
import { fmtARS } from '../utils/money.ts';
import { Button } from './ui/Button.tsx';
import { InputBase, SelectBase } from './ui/InputBase.tsx';

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

  const labelCls = 'block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400';

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 space-y-3">
      <div className="font-semibold text-sm text-neutral-700 dark:text-neutral-200">
        {initial ? 'Editar segmento de ahorro' : 'Nuevo segmento de ahorro'}
      </div>

      <div>
        <label className={labelCls}>Nombre del segmento *</label>
        <InputBase
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Auto, Vacaciones, Fondo emergencia"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>Desde</label>
          <SelectBase value={startMonth} onChange={(e) => setStartMonth(e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </SelectBase>
        </div>
        <div>
          <label className={labelCls}>Hasta</label>
          <SelectBase value={endMonth} onChange={(e) => setEndMonth(e.target.value)}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </SelectBase>
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
            <div key={extra.id} className="flex items-center justify-between gap-2 glass rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate dark:text-neutral-100">{extra.label}</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{extra.month} · {fmtARS(extra.amount, 0)}</div>
              </div>
              <button
                type="button"
                aria-label="Quitar ingreso extra"
                onClick={() => setExtras((prev) => prev.filter((e) => e.id !== extra.id))}
                className="text-neutral-300 hover:text-accent-red text-sm shrink-0 dark:text-neutral-600"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <InputBase
            value={extraLabel}
            onChange={(e) => setExtraLabel(e.target.value)}
            placeholder="Bono fin de año"
          />
          <InputBase
            value={extraAmount}
            onChange={(e) => setExtraAmount(e.target.value)}
            placeholder="1.500.000"
            inputMode="decimal"
          />
          <div className="flex gap-1">
            <SelectBase value={extraMonth} onChange={(e) => setExtraMonth(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </SelectBase>
            <Button
              onClick={addExtra}
              className="shrink-0"
              aria-label="Agregar ingreso extra"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="soft-lime rounded-2xl px-3 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase text-olive">Ahorro proyectado</span>
        <span className="text-sm font-bold tabular-nums text-olive">{fmtARS(totalPreview(), 0)}</span>
      </div>

      {startMonth > endMonth && (
        <p className="text-xs text-accent-red">"Desde" debe ser anterior o igual a "Hasta".</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={!name.trim() || startMonth > endMonth}
          fullWidth
          className="disabled:opacity-40"
        >
          Guardar
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}