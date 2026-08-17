import { useState } from 'react';
import type { Expense, Month, SavingsGoal } from '../types.ts';
import { projectSavings, monthlySavingsHistory } from '../utils/savings.ts';
import { fmtARS } from '../utils/money.ts';
import { SavingsChart } from './SavingsChart.tsx';

interface Props {
  goals: SavingsGoal[];
  months: Month[];
  expenses: Expense[];
  onAdd: () => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (id: number) => void;
  onRemoveExtra: (goalId: number, extraId: string) => void;
}

function monthLabel(id: string): string {
  const [y, m] = id.split('-').map(Number);
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${names[m - 1]} ${String(y).slice(2)}`;
}

export function SavingsCalculator({ goals, months, expenses, onAdd, onEdit, onDelete, onRemoveExtra }: Props) {
  const [confirmDelete, setConfirmDelete] = useState<SavingsGoal | null>(null);

  if (goals.length === 0) {
    return (
      <div className="px-4 py-10 text-center">
        <div className="text-4xl mb-2">💰</div>
        <p className="text-sm opacity-60 mb-4">
          Todavía no tenés segmentos de ahorro proyectados.
          <br />
          Creá uno para proyectar, por ejemplo, cuánto podés juntar para tu auto.
        </p>
        <button
          type="button"
          onClick={onAdd}
          className="px-5 py-2.5 text-sm font-bold rounded-full btn-aura transition"
        >
          + Nuevo segmento
        </button>
      </div>
    );
  }

  const history = monthlySavingsHistory(months, expenses);

  return (
    <div className="space-y-3 px-4 py-4">
      <SavingsChart history={history} />

      {goals.map((goal) => {
        const proj = projectSavings(goal, months, expenses);
        return (
          <div key={goal.id} className="glass-card rounded-3xl p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                     style={{ background: 'linear-gradient(135deg, rgba(132,204,22,.16), rgba(16,185,129,.12))', border: '1px solid rgba(132,204,22,.25)' }}>
                  🎯
                </div>
                <div>
                  <div className="font-bold text-neutral-900 dark:text-neutral-100">{goal.name}</div>
                  <div className="text-[11px] opacity-50">
                    {monthLabel(goal.startMonth)} → {monthLabel(goal.endMonth)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold tabular-nums" style={{ color: '#4d7c0f' }}>
                  {fmtARS(proj.total, 0)}
                </div>
                <div className="text-[10px] opacity-50 uppercase">proyectado</div>
              </div>
            </div>

            {/* Desglose mensual */}
            {proj.months.length > 0 && (
              <div className="mt-3 space-y-1">
                {proj.months.map((p) => (
                  <div key={p.monthId} className="flex items-center justify-between text-xs">
                    <span className="opacity-70">{monthLabel(p.monthId)}</span>
                    <span className="flex items-center gap-3">
                      {p.estimated && (
                        <span className="text-[10px] opacity-40 italic">≈ estimado</span>
                      )}
                      {p.extras.length > 0 && (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          +{p.extras.map((e) => e.label).join(', ')}
                        </span>
                      )}
                      <span className={`font-semibold tabular-nums ${p.total < 0 ? 'text-red-500' : ''}`}>
                        {fmtARS(p.total, 0)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Ingresos extra */}
            {goal.extraIncomes.length > 0 && (
              <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/10 space-y-1">
                <div className="text-[10px] font-semibold uppercase opacity-50">Ingresos extra</div>
                {goal.extraIncomes.map((extra) => (
                  <div key={extra.id} className="flex items-center justify-between text-xs">
                    <span className="opacity-70">
                      {extra.label} · {monthLabel(extra.month)}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">{fmtARS(extra.amount, 0)}</span>
                      <button
                        type="button"
                        aria-label="Quitar"
                        onClick={() => goal.id && onRemoveExtra(goal.id, extra.id)}
                        className="text-neutral-300 hover:text-red-500 dark:text-neutral-600 dark:hover:text-red-400"
                      >
                        ✕
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Acciones */}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(goal)}
                className="flex-1 px-3 py-2 text-xs font-semibold glass rounded-full hover:opacity-80 transition"
              >
                ✎ Editar
              </button>
              <button
                type="button"
                onClick={() => goal.id && setConfirmDelete(goal)}
                className="flex-1 px-3 py-2 text-xs font-semibold text-red-600 glass rounded-full hover:opacity-80 transition dark:text-red-400"
              >
                🗑 Eliminar
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAdd}
        className="w-full px-3 py-3 text-sm font-bold rounded-full btn-aura transition"
      >
        + Nuevo segmento
      </button>

      {/* Confirmación borrado */}
      {confirmDelete && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">¿Eliminar segmento?</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Se borrará el segmento <span className="font-semibold">{confirmDelete.name}</span> y sus ingresos extra.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirmDelete.id) onDelete(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-full hover:bg-red-600 transition"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}