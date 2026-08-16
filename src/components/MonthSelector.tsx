import { useState } from 'react';
import type { Month } from '../types.ts';
import {
  currentMonthId,
  monthLabelFromId,
  type NewMonthInput,
} from '../hooks/useBudget.ts';

interface Props {
  months: Month[];
  activeMonthId: string | null;
  onSelect: (id: string) => void;
  onCreate: (input: NewMonthInput) => Promise<void>;
}

export function MonthSelector({ months, activeMonthId, onSelect, onCreate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [newId, setNewId] = useState(() => currentMonthId());
  const [newLabel, setNewLabel] = useState('');
  const [newIncome, setNewIncome] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollLeft > 8);
  };

  function openModal() {
    setErrorMsg('');
    setShowModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const income = Number(newIncome);
    if (!newId || isNaN(income) || income <= 0) return;

    // Validación: el ID del mes ya existe
    if (months.some((m) => m.id === newId)) {
      setErrorMsg(`El mes ${newId} ya existe. Elegí otro ID.`);
      return;
    }

    try {
      await onCreate({
        id: newId,
        label: newLabel || monthLabelFromId(newId),
        income,
      });
      setShowModal(false);
      setNewLabel('');
      setNewIncome('');
      setErrorMsg('');
    } catch {
      setErrorMsg('No se pudo crear el mes. Probá con otro ID.');
    }
  }

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60">
      <div
        onScroll={handleScroll}
        className="px-2 py-2 flex items-center gap-2 overflow-x-auto"
      >
        {/* Botón sticky con efecto glass: blur suave sobre los meses al scrollear */}
        <div
          className={`sticky left-2 z-10 shrink-0 -my-1 py-1 pl-1 pr-2 rounded-xl transition-all duration-300 ease-out ${
            scrolled
              ? 'bg-neutral-50/70 backdrop-blur-md shadow-sm dark:bg-neutral-900/70'
              : 'bg-transparent'
          }`}
        >
          <button
            type="button"
            onClick={openModal}
            className={`px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 shadow-sm transition-all duration-300 ease-out whitespace-nowrap origin-left ${
              scrolled ? 'scale-[0.95] opacity-95' : 'scale-100 opacity-100'
            }`}
          >
            + Crear Mes
          </button>
        </div>
        {months.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m.id)}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition ${
              m.id === activeMonthId
                ? 'bg-neutral-900 text-white dark:bg-emerald-500 dark:text-neutral-950'
                : 'bg-white border border-neutral-300 text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700'
            }`}
          >
            {m.status === 'cerrado' && '🔒 '}
            {m.label}
          </button>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800"
          >
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Crear Nuevo Mes</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Se clonarán los gastos del mes anterior (los arrancan sin pagar).
            </p>

            {errorMsg && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900">
                ⚠️ {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                ID (AAAA-MM)
              </label>
              <input
                type="month"
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                Etiqueta (opcional — auto: "Agosto 2026")
              </label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={monthLabelFromId(newId)}
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                Ingreso del mes (ARS) *
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={newIncome}
                onChange={(e) => setNewIncome(e.target.value)}
                placeholder="Ej: 5000000"
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
              >
                Crear y abrir
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}