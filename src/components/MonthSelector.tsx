import { useEffect, useRef, useState } from 'react';
import type { Month } from '../types.ts';
import {
  currentMonthId,
  monthLabelFromId,
  type NewMonthInput,
} from '../hooks/useBudget.ts';
import { Icon } from './ui/Icon.tsx';

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
  const [errorMsg, setErrorMsg] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Al cambiar el mes activo, scrollea horizontalmente hasta que el chip activo quede visible
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
    <div className="px-3 pt-1 pb-1">
      {/* Chips de meses: scroll horizontal suave, sin scroll vertical */}
      <div ref={scrollRef} className="months-scroll items-center">
        {/* Botón fijo a la izquierda: queda pegado al scrollear los meses */}
        <button
          type="button"
          onClick={openModal}
          className="sticky left-0 z-10 shrink-0 min-h-[32px] px-3 text-[11px] font-bold rounded-full chip-active transition-all duration-300 ease-out whitespace-nowrap"
          style={{ boxShadow: '0 8px 20px -8px rgba(132,204,22,.6), 0 0 0 6px var(--glass-bg)' }}
        >
          + Mes
        </button>
        {months.map((m) => {
          const isCurrent = m.id === currentMonthId();
          const stateCls =
            m.id === activeMonthId
              ? 'chip-active'
              : m.status === 'cerrado'
                ? 'month-link month-link--closed'
                : isCurrent
                  ? 'month-link month-link--current'
                  : 'month-link month-link--open';
          return (
            <button
              key={m.id}
              type="button"
              data-month-id={m.id}
              onClick={() => onSelect(m.id)}
              className={`shrink-0 min-h-[32px] px-2.5 text-[11px] font-semibold rounded-full transition ${stateCls}`}
              title={m.status === 'cerrado' ? `${m.label} (cerrado)` : m.label}
            >
              {m.status === 'cerrado' && (
                <Icon name="lock" size={12} className="inline-block mr-1 align-[-1px]" />
              )}
              {m.label}
            </button>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3"
          >
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Crear Nuevo Mes</div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Se clonarán los gastos del mes anterior (los arrancan sin pagar).
            </p>

            {errorMsg && (
              <div className="text-xs text-accent-red glass rounded-xl px-3 py-2">
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