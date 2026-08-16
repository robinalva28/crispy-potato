import { useRef, useState } from 'react';
import type { Category, Expense } from '../types.ts';
import { parseLocalNumber, formatInputNumber } from '../utils/format.ts';
import { MoneyInput } from './MoneyInput.tsx';
import { extractInvoice } from '../utils/invoiceExtract.ts';

const CATEGORIES: Category[] = [
  'vivienda', 'servicios', 'tarjetas', 'eventos', 'salud', 'impuestos', 'otros',
];

type FormState = {
  name: string;
  category: Category;
  amountArs: string; // '' = null (por confirmar)
  estimatedArs: string;
  amountUsd: string;
  usdRate: string;
  dueDate: string;
  paid: boolean;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  category: 'otros',
  amountArs: '',
  estimatedArs: '',
  amountUsd: '',
  usdRate: '',
  dueDate: '',
  paid: false,
  notes: '',
};

function toForm(e: Expense | null): FormState {
  if (!e) return EMPTY_FORM;
  return {
    name: e.name,
    category: e.category,
    amountArs: e.amountArs != null ? formatInputNumber(e.amountArs) : '',
    estimatedArs: e.estimatedArs != null ? formatInputNumber(e.estimatedArs) : '',
    amountUsd: e.amountUsd > 0 ? formatInputNumber(e.amountUsd) : '',
    usdRate: e.usdRate > 0 ? formatInputNumber(e.usdRate) : '',
    dueDate: e.dueDate ?? '',
    paid: e.paid,
    notes: e.notes ?? '',
  };
}

interface Props {
  initial: Expense | null;
  onSave: (data: Omit<Expense, 'id' | 'monthId'>) => void;
  onCancel: () => void;
  onGetLastUsdRate?: () => Promise<number | null>;
}

export function ExpenseForm({ initial, onSave, onCancel, onGetLastUsdRate }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const hasUsd = form.amountUsd !== '';

  /** Escanea una factura y autocompleta los campos con los datos detectados. */
  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanError('');
    try {
      const inv = await extractInvoice(file);
      setForm((f) => ({
        ...f,
        name: inv.name || f.name,
        amountArs: inv.amountArs != null ? formatInputNumber(inv.amountArs) : f.amountArs,
        amountUsd: inv.amountUsd > 0 ? formatInputNumber(inv.amountUsd) : f.amountUsd,
        dueDate: inv.dueDate || f.dueDate,
        notes: inv.notes ? (f.notes ? `${f.notes} — ${inv.notes}` : inv.notes) : f.notes,
      }));
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'No se pudo leer la factura');
    } finally {
      setScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Al escribir USD, si quedó vacía la cotización, autocompleta con la última usada. */
  async function handleAmountUsdChange(raw: string) {
    set('amountUsd', raw);
    if (raw !== '' && form.usdRate === '' && onGetLastUsdRate) {
      const lastRate = await onGetLastUsdRate();
      if (lastRate != null && lastRate > 0) {
        set('usdRate', formatInputNumber(lastRate));
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const estimatedArs = form.estimatedArs === '' ? null : parseLocalNumber(form.estimatedArs);
    const amountUsd = form.amountUsd === '' ? 0 : (parseLocalNumber(form.amountUsd) ?? 0);
    const usdRate = form.usdRate === '' ? 0 : (parseLocalNumber(form.usdRate) ?? 0);
    const hasConfirmedUsd = amountUsd > 0 && usdRate > 0;

    // Un gasto SOLO en USD con cotización cargada es un gasto CONFIRMADO:
    // amountArs = 0 (no "por confirmar", que se marca con null).
    const amountArs = form.amountArs === ''
      ? (hasConfirmedUsd ? 0 : null)
      : parseLocalNumber(form.amountArs);

    if (amountArs == null && estimatedArs == null && amountUsd === 0) return; // nada cargado

    onSave({
      name: form.name.trim(),
      category: form.category,
      amountArs,
      estimatedArs,
      amountUsd,
      usdRate,
      dueDate: form.dueDate || null,
      paid: form.paid,
      notes: form.notes.trim(),
    });
  }

  const inputCls =
    'w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100';

  return (
    <form
      onSubmit={handleSubmit}
      className="px-4 py-3 space-y-3 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/60"
    >
      <div className="font-semibold text-sm text-neutral-700 dark:text-neutral-200">
        {initial ? 'Editar gasto' : 'Agregar gasto'}
      </div>

      <div>
        <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Nombre *</label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          placeholder="Ej: Alquiler"
        />
      </div>

      <div>
        <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Categoría</label>
        <select
          className={inputCls}
          value={form.category}
          onChange={(e) => set('category', e.target.value as Category)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
            Monto ARS ($)
          </label>
          <MoneyInput symbol="$" value={form.amountArs} onChange={(v) => set('amountArs', v)} placeholder="688.000" />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
            Estimado ARS ($) {!form.amountArs && <span className="text-amber-600 dark:text-amber-400">(por confirmar)</span>}
          </label>
          <MoneyInput symbol="$" value={form.estimatedArs} onChange={(v) => set('estimatedArs', v)} placeholder="80.000" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Monto USD (u$d)</label>
          <MoneyInput symbol="u$d" value={form.amountUsd} onChange={handleAmountUsdChange} placeholder="10,90" />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
            Cotización USD ($){hasUsd && <span className="text-amber-600 dark:text-amber-400"> (requerido)</span>}
          </label>
          <MoneyInput symbol="$" value={form.usdRate} onChange={(v) => set('usdRate', v)} placeholder="1.200" required={hasUsd} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Vencimiento</label>
          <input
            type="date"
            className={inputCls}
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 pb-1.5 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={(e) => set('paid', e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          Pagado ✓
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleScan}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={scanning}
            title="Escanear factura"
            aria-label="Escanear factura"
            className="w-8 h-8 rounded-md text-lg bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-900/40 dark:hover:bg-violet-900/60 dark:text-violet-300 transition disabled:opacity-40"
          >
            {scanning ? '⏳' : '📷'}
          </button>
        </label>
      </div>
      {scanError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">
          ⚠️ {scanError}
        </p>
      )}

      <div>
        <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Notas</label>
        <input
          className={inputCls}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
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