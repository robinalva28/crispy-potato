import { useEffect, useRef, useState } from 'react';
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
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrolled(e.currentTarget.scrollLeft > 8);
  };

  // Al montar o al cambiar el mes activo, scrollea hasta que el chip activo quede visible
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !activeMonthId) return;
    const activeChip = container.querySelector<HTMLButtonElement>(
      `[data-month-id="${activeMonthId}"]`
    );
    if (!activeChip) return;
    container.scrollTo({
      left: activeChip.offsetLeft - container.clientWidth / 2 + activeChip.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [activeMonthId]);

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
    <div className="px-3 py-2">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="months-scroll items-center"
      >
        {/* Botón sticky con efecto glass: blur suave sobre los meses al scrollear */}
        <div
          className={`sticky left-0 z-10 shrink-0 -my-1 py-1 pl-1 pr-2 rounded-full transition-all duration-300 ease-out ${
            scrolled ? 'glass shadow-sm' : 'bg-transparent'
          }`}
        >
          <button
            type="button"
            onClick={openModal}
            className={`px-3.5 py-2 text-xs font-bold rounded-full chip-active transition-all duration-300 ease-out whitespace-nowrap origin-left ${
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
            data-month-id={m.id}
            onClick={() => onSelect(m.id)}
            className={`shrink-0 px-3.5 py-2 text-xs font-semibold rounded-full transition ${
              m.id === activeMonthId
                ? 'chip-active'
                : 'glass text-neutral-600 hover:opacity-80 dark:text-neutral-300'
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
            className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3"
          >
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Crear Nuevo Mes</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Se clonarán los gastos del mes anterior (los arrancan sin pagar).
            </p>

            {errorMsg && (
              <div className="text-xs text-red-600 glass rounded-xl px-3 py-2 dark:text-red-400">
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
                className="input-aura w-full px-3 py-2 text-sm"
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
                className="input-aura w-full px-3 py-2 text-sm"
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
                className="input-aura w-full px-3 py-2 text-sm"
                required
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-sm font-semibold rounded-full btn-aura transition"
              >
                Crear y abrir
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
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