import { useRef, useState } from 'react';
import type { Category, Expense } from '../types.ts';
import { parseLocalNumber, formatInputNumber } from '../utils/format.ts';
import { MoneyInput } from './MoneyInput.tsx';
import { InputBase, SelectBase } from './ui/InputBase.tsx';
import { Button } from './ui/Button.tsx';
import { Icon } from './ui/Icon.tsx';
import { extractInvoice } from '../utils/invoiceExtract.ts';
import { inferCategory } from '../utils/photoExtract.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../utils/money.ts';

const CATEGORIES: Category[] = CATEGORY_ORDER;

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

type SectionKey = 'basicos' | 'montos' | 'extras';
type CurrencyMode = 'real' | 'estimate';

export function ExpenseForm({ initial, onSave, onCancel, onGetLastUsdRate }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    basicos: true,
    montos: true,
    extras: false,
  });
  const [arsEnabled, setArsEnabled] = useState(true);
  const [usdEnabled, setUsdEnabled] = useState(
    () => initial != null && (initial.amountUsd > 0 || initial.usdRate > 0)
  );
  // Modo de monto por divisa: 'real' = monto confirmado, 'estimate' = estimado / por confirmar.
  // No pueden convivir monto real y estimado a la vez: el toggle elige cuál se carga.
  const [arsMode, setArsMode] = useState<CurrencyMode>(() =>
    initial != null && initial.amountArs == null && initial.estimatedArs != null ? 'estimate' : 'real'
  );
  const [usdMode, setUsdMode] = useState<CurrencyMode>(() =>
    initial != null && initial.amountArs == null ? 'estimate' : 'real'
  );
  const hasUsd = usdEnabled && form.amountUsd !== '';

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
        // La categoría se infiere del proveedor cuando sea posible
        category: inv.name ? inferCategory(inv.name) : f.category,
        amountArs: inv.amountArs != null ? formatInputNumber(inv.amountArs) : f.amountArs,
        amountUsd: inv.amountUsd > 0 ? formatInputNumber(inv.amountUsd) : f.amountUsd,
        dueDate: inv.dueDate || f.dueDate,
        // Notes NO se rellenan con el detalle del escaneo (ya no son necesarias)
        notes: f.notes,
      }));
      // Sincroniza los toggles de divisa y el modo con lo detectado en la factura
      if (inv.amountArs != null) {
        setArsEnabled(true);
        setArsMode('real');
      }
      if (inv.amountUsd > 0) {
        setUsdEnabled(true);
        setUsdMode('real');
      }
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

  function toggleSection(key: SectionKey) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  /** Toggle de divisa (multi): siempre queda al menos una activa. */
  function toggleCurrency(cur: 'ars' | 'usd') {
    if (cur === 'ars') {
      const next = !arsEnabled;
      setArsEnabled(next);
      if (!next && !usdEnabled) setUsdEnabled(true);
    } else {
      const next = !usdEnabled;
      setUsdEnabled(next);
      if (!next && !arsEnabled) setArsEnabled(true);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // El modo por divisa decide qué campo se guarda:
    // - ARS 'real' → amountArs; ARS 'estimate' → estimatedArs (amountArs = null)
    // - USD 'real' → puede confirmar el gasto solo con cotización;
    //   USD 'estimate' → el gasto queda "por confirmar" aunque haya USD.
    const estimatedArs = arsEnabled && arsMode === 'estimate' && form.estimatedArs !== ''
      ? parseLocalNumber(form.estimatedArs)
      : null;
    const amountUsd = usdEnabled && form.amountUsd !== '' ? (parseLocalNumber(form.amountUsd) ?? 0) : 0;
    const usdRate = usdEnabled && form.usdRate === '' ? 0 : (parseLocalNumber(form.usdRate) ?? 0);
    const hasConfirmedUsd = usdEnabled && usdMode === 'real' && amountUsd > 0 && usdRate > 0;

    // Un gasto SOLO en USD con cotización cargada y modo "real" es CONFIRMADO:
    // amountArs = 0 (no "por confirmar", que se marca con null).
    const amountArs = !arsEnabled || arsMode === 'estimate' || form.amountArs === ''
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

  /** Clases para los botones segmentados (igual que la Opción D).
   *  variant 'success' → Pagado (gradiente esmeralda = éxito)
   *  variant 'warning' → Pendiente (delineado ámbar = aviso)
   *  default → divisas (gradiente lime) */
  function segButtonClass(on: boolean, variant: 'default' | 'success' | 'warning' = 'default') {
    const activeCls =
      variant === 'success'
        ? 'grad-emerald text-white font-bold border-transparent'
        : variant === 'warning'
          ? 'bg-amber-500/[0.08] border-accent-amber text-accent-amber font-bold'
          : 'grad-lime text-white font-bold border-transparent';
    return `flex-1 min-h-[44px] px-2 rounded-full text-[13px] flex items-center justify-center gap-1.5 transition border ${
      on
        ? activeCls
        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--muted)] font-medium'
    }`;
  }

  /** Clases para el mini toggle Monto/Estimado: activo con delineado lime y texto lime. */
  function miniSegClass(on: boolean) {
    return `flex-1 min-h-[32px] px-2 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1 transition border ${
      on
        ? 'bg-lime-500/[0.08] border-accent-lime text-accent-lime'
        : 'bg-transparent border-transparent text-[var(--muted)]'
    }`;
  }

  /**
   * Wrapper colapsable con animación de altura suave.
   * Mantiene los inputs montados (conserva valores y foco) y evita el
   * salto brusco de scroll al alternar divisas.
   */
  function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
    return (
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">{children}</div>
      </div>
    );
  }

  /** Sección acordeón: header clickeable + cuerpo colapsable. */
  function Section({
    icon,
    title,
    open,
    onToggle,
    children,
  }: {
    icon: 'tag' | 'wallet' | 'paperclip';
    title: string;
    open: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) {
    return (
      <div className="mb-2.5">
        <div
          className={`rounded-2xl border overflow-hidden transition-colors ${
            open ? 'border-accent-lime' : 'border-[var(--border)]'
          }`}
          style={{ background: 'var(--surface)' }}
        >
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-2.5 w-full min-h-[52px] px-3"
            aria-expanded={open}
          >
            <Icon name={icon} size={18} className="text-[var(--muted)] shrink-0" />
            <span className="flex-1 text-left text-[13px] font-semibold text-[var(--txt)]">{title}</span>
            <Icon
              name="chevronDown"
              size={16}
              className={`shrink-0 transition-transform duration-200 ${
                open ? 'rotate-180 text-accent-lime' : 'text-[var(--muted)]'
              }`}
              ariaHidden
            />
          </button>
          {open && <div className="px-3 pb-3.5 pt-1">{children}</div>}
        </div>
      </div>
    );
  }

  /** Bloque de divisa con toggle Monto/Estimado y su input condicional. */
  function CurrencyBlock({
    enabled,
    mode,
    onMode,
    realLabel,
    estimateLabel,
    estimateHint,
    realInput,
    estimateInput,
    usd = false,
  }: {
    enabled: boolean;
    mode: CurrencyMode;
    onMode: (m: CurrencyMode) => void;
    realLabel: string;
    estimateLabel: string;
    estimateHint?: string;
    realInput: React.ReactNode;
    estimateInput: React.ReactNode;
    usd?: boolean;
  }) {
    if (!enabled) return null;
    return (
      <div className={usd ? 'pt-3' : ''}>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label className="text-[11px] text-neutral-500 font-medium dark:text-neutral-400 m-0">
            {mode === 'real' ? realLabel : estimateLabel}
          </label>
          <div className="flex p-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] w-fit">
            <button
              type="button"
              className={miniSegClass(mode === 'real')}
              onClick={(e) => { e.preventDefault(); onMode('real'); }}
            >
              Monto
            </button>
            <button
              type="button"
              className={miniSegClass(mode === 'estimate')}
              onClick={(e) => { e.preventDefault(); onMode('estimate'); }}
            >
              Estimado
            </button>
          </div>
        </div>
        {mode === 'real' ? realInput : estimateInput}
        {mode === 'estimate' && estimateHint && (
          <div className="mt-1 text-[11px] text-accent-amber">
            <Icon name="alert" size={11} className="inline-block mr-1 align-[-1px]" />{estimateHint}
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative px-4 py-3 rounded-2xl border-2 border-accent-violet bg-violet-500/[0.06]"
    >
      <div className="flex items-center gap-2 mb-3.5 min-h-[32px]">
        <span className="w-8 h-8 rounded-[10px] bg-[var(--surface)] flex items-center justify-center text-accent-violet shrink-0">
          <Icon name={initial ? 'pencil' : 'plus'} size={18} />
        </span>
        <div className="flex-1 font-semibold text-sm text-neutral-700 dark:text-neutral-200">
          {initial ? 'Editar gasto' : 'Agregar gasto'}
        </div>
        {/* Cerrar discreto: acceso rápido a cancelar sin scrollear hasta el footer */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar"
          title="Cancelar"
          className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full text-[var(--muted)] transition hover:opacity-70 active:opacity-50 -mr-2"
        >
          <Icon name="x" size={18} />
        </button>
      </div>

      {/* Overlay de carga evidente mientras se escanea la factura */}
      {scanning && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-white/75 dark:bg-neutral-900/75 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          <div className="text-sm font-semibold text-accent-violet">
            Escaneando factura…
          </div>
          <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
            Leyendo la foto para autocompletar los campos
          </div>
        </div>
      )}

      {/* Sección 1: Datos básicos */}
      <Section
        icon="tag"
        title="Datos básicos"
        open={openSections.basicos}
        onToggle={() => toggleSection('basicos')}
      >
        <div className="mb-3">
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Nombre *</label>
          <InputBase
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            required
            placeholder="Ej: Alquiler"
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Categoría</label>
          <SelectBase
            value={form.category}
            onChange={(e) => set('category', e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </SelectBase>
        </div>
      </Section>

      {/* Sección 2: Montos */}
      <div className="mb-3">
      <Section
        icon="wallet"
        title="Montos"
        open={openSections.montos}
        onToggle={() => toggleSection('montos')}
      >
        <div className="mb-3">
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Estado</label>
          <div className="flex gap-2">
            <button
              type="button"
              className={segButtonClass(form.paid, 'success')}
              onClick={(e) => { e.preventDefault(); set('paid', true); }}
            >
              <Icon name="check" size={16} />Pagado
            </button>
            <button
              type="button"
              className={segButtonClass(!form.paid, 'warning')}
              onClick={(e) => { e.preventDefault(); set('paid', false); }}
            >
              <Icon name="clock" size={16} />Pendiente
            </button>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
            ¿En qué cargás el gasto?
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              className={segButtonClass(arsEnabled)}
              onClick={(e) => { e.preventDefault(); toggleCurrency('ars'); }}
            >
              AR$ Pesos
            </button>
            <button
              type="button"
              className={segButtonClass(usdEnabled)}
              onClick={(e) => { e.preventDefault(); toggleCurrency('usd'); }}
            >
              u$d Dólares
            </button>
          </div>
        </div>

        <div className="h-px bg-[var(--border)] my-3" />

        {/* ARS: un solo input según el modo Monto/Estimado */}
        <Collapse open={arsEnabled}>
          <CurrencyBlock
            enabled={arsEnabled}
            mode={arsMode}
            onMode={setArsMode}
            realLabel="Monto ARS ($)"
            estimateLabel="Estimado ARS ($)"
            estimateHint="si no cargás monto, queda por confirmar"
            realInput={
              <MoneyInput symbol="$" value={form.amountArs} onChange={(v) => set('amountArs', v)} placeholder="688.000" />
            }
            estimateInput={
              <MoneyInput symbol="$" estimate value={form.estimatedArs} onChange={(v) => set('estimatedArs', v)} placeholder="80.000" />
            }
          />
        </Collapse>

        {/* USD: un solo input según el modo Monto/Estimado (estimado = por confirmar, ámbar) */}
        <Collapse open={usdEnabled}>
          <CurrencyBlock
            enabled={usdEnabled}
            mode={usdMode}
            onMode={setUsdMode}
            realLabel="Monto USD (u$d)"
            estimateLabel="Monto USD estimado (u$d)"
            estimateHint="monto sin confirmar"
            usd
            realInput={
              <MoneyInput symbol="u$d" value={form.amountUsd} onChange={handleAmountUsdChange} placeholder="10,90" />
            }
            estimateInput={
              <MoneyInput symbol="u$d" estimate value={form.amountUsd} onChange={handleAmountUsdChange} placeholder="10,90" />
            }
          />
          <div className="grid grid-cols-1 gap-2 mt-3">
            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                Cotización USD ($){usdEnabled && usdMode === 'real' && hasUsd && <span className="text-accent-amber"> (requerido)</span>}
              </label>
              <MoneyInput
                symbol="$"
                value={form.usdRate}
                onChange={(v) => set('usdRate', v)}
                placeholder="1.200"
                required={usdEnabled && usdMode === 'real' && hasUsd}
                estimate={usdMode === 'estimate'}
              />
              {usdEnabled && usdMode === 'real' && hasUsd && (
                <div className="mt-1 text-[11px] text-accent-amber">
                  <Icon name="alert" size={11} className="inline-block mr-1 align-[-1px]" />requerido si hay USD
                </div>
              )}
            </div>
          </div>
        </Collapse>
      </Section>
      </div>

      {/* Sección 3: Extras */}
      <Section
        icon="paperclip"
        title="Extras"
        open={openSections.extras}
        onToggle={() => toggleSection('extras')}
      >
        <div className="mb-3">
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Vencimiento</label>
          <InputBase
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Notas</label>
          <InputBase
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Opcional"
          />
        </div>
      </Section>

      {scanError && (
        <p className="text-[11px] text-accent-red pt-1">
          <Icon name="alert" size={14} className="inline-block mr-1 align-[-2px]" />{scanError}
        </p>
      )}

      {/* Input file oculto: lo dispara el botón "Escanear" */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleScan}
        className="hidden"
      />

      <div className="flex items-center gap-2 pt-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1 flex items-center justify-center gap-1.5">
          Cancelar
        </Button>
        <Button
          variant="violet"
          onClick={() => fileRef.current?.click()}
          disabled={scanning}
          title="Escanear factura"
          aria-label="Escanear factura"
          className="flex-1 flex items-center justify-center gap-1.5"
        >
          <Icon name="scan" size={18} />Escanear
        </Button>
        <Button type="submit" className="flex-[1.6] flex items-center justify-center gap-1.5">
          <Icon name="check" size={16} />Guardar
        </Button>
      </div>
    </form>
  );
}