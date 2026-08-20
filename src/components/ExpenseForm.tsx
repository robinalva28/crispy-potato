import { useRef, useState } from 'react';
import type { Category, Expense } from '../types.ts';
import { parseLocalNumber, formatInputNumber } from '../utils/format.ts';
import { MoneyInput } from './MoneyInput.tsx';
import { InputBase, SelectBase } from './ui/InputBase.tsx';
import { Button } from './ui/Button.tsx';
import { Icon } from './ui/Icon.tsx';
import { extractInvoice } from '../utils/invoiceExtract.ts';
import { inferCategory } from '../utils/photoExtract.ts';
import { CATEGORY_LABELS, CATEGORY_ORDER, getExpenseTotal, fmtARS, fmtUSD } from '../utils/money.ts';

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
  paid: true,
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

/** Clases para el chip "Estimado" (misma paleta de "por confirmar": ámbar). */
function miniChipClass(on: boolean) {
  return `inline-flex items-center gap-1 border rounded-full px-2 py-1 text-[9px] font-bold cursor-pointer transition-all duration-150 ${
    on
      ? 'border-accent-amber bg-amber-500/[0.1] text-accent-amber'
      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]'
  }`;
}

/**
 * Wrapper colapsable con animación de altura suave.
 * Mantiene los inputs montados (conserva valores y foco).
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
          className="flex items-center gap-2.5 w-full min-h-[46px] px-3"
          aria-expanded={open}
        >
          <Icon name={icon} size={17} className="text-[var(--muted)] shrink-0" />
          <span className="flex-1 text-left text-[12.5px] font-semibold text-[var(--txt)]">{title}</span>
          <Icon
            name="chevronDown"
            size={15}
            className={`shrink-0 transition-transform duration-200 ${
              open ? 'rotate-180 text-accent-lime' : 'text-[var(--muted)]'
            }`}
          />
        </button>
        <Collapse open={open}>
          <div className="px-3 pb-3.5 pt-1">{children}</div>
        </Collapse>
      </div>
    </div>
  );
}

export function ExpenseForm({ initial, onSave, onCancel, onGetLastUsdRate }: Props) {
  const [form, setForm] = useState<FormState>(() => toForm(initial));
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Acordeón exclusivo: cuando una sección se abre, las otras se cierran.
  const [openSection, setOpenSection] = useState<SectionKey | null>('basicos');
  // USD se expande DENTRO de la misma card de Montos (no en otra sección).
  const [usdExpanded, setUsdExpanded] = useState(
    () => initial != null && (initial.amountUsd > 0 || initial.usdRate > 0)
  );
  const [arsMode, setArsMode] = useState<CurrencyMode>(() =>
    initial != null && initial.amountArs == null && initial.estimatedArs != null ? 'estimate' : 'real'
  );
  const [usdMode, setUsdMode] = useState<CurrencyMode>(() =>
    initial != null && initial.amountArs == null ? 'estimate' : 'real'
  );
  // Confirmación final: mini modal con resumen ANTES de persistir.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSave, setPendingSave] = useState<Omit<Expense, 'id' | 'monthId'> | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  // Refs de wrappers para la navegación "Siguiente" del teclado.
  const nameWrap = useRef<HTMLDivElement | null>(null);
  const catWrap = useRef<HTMLDivElement | null>(null);
  const arsWrap = useRef<HTMLDivElement | null>(null);
  const usdAmtWrap = useRef<HTMLDivElement | null>(null);
  const usdRateWrap = useRef<HTMLDivElement | null>(null);
  const dueWrap = useRef<HTMLDivElement | null>(null);
  const notesWrap = useRef<HTMLDivElement | null>(null);

  const hasUsd = usdExpanded && form.amountUsd !== '';

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
        category: inv.name ? inferCategory(inv.name) : f.category,
        amountArs: inv.amountArs != null ? formatInputNumber(inv.amountArs) : f.amountArs,
        amountUsd: inv.amountUsd > 0 ? formatInputNumber(inv.amountUsd) : f.amountUsd,
        dueDate: inv.dueDate || f.dueDate,
        notes: f.notes,
      }));
      if (inv.amountArs != null) {
        setArsMode('real');
      }
      if (inv.amountUsd > 0) {
        setUsdExpanded(true);
        setUsdMode('real');
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'No se pudo leer la factura');
      const scrollEl = document.querySelector<HTMLElement>('.exp-form-scroll');
      scrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
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
    setOpenSection((current) => (current === key ? null : key));
  }

  function toggleUsd() {
    setUsdExpanded((v) => !v);
  }

  // ── Navegación por teclado: "Siguiente" salta al próximo input ──
  // Si el próximo campo vive en otra sección, se ABRE esa sección primero.
  const steps: { section: SectionKey; wrap: React.RefObject<HTMLDivElement | null> }[] = [
    { section: 'basicos', wrap: nameWrap },
    { section: 'basicos', wrap: catWrap },
    { section: 'montos', wrap: arsWrap },
    ...(usdExpanded
      ? ([
          { section: 'montos', wrap: usdAmtWrap },
          { section: 'montos', wrap: usdRateWrap },
        ] satisfies { section: SectionKey; wrap: React.RefObject<HTMLDivElement | null> }[])
      : []),
    { section: 'extras', wrap: dueWrap },
    { section: 'extras', wrap: notesWrap },
  ];

  /** Atrapa Enter/Tab del teclado móvil ("Siguiente") y mueve el foco. */
  function handleNext(e: React.KeyboardEvent, wrap: React.RefObject<HTMLDivElement | null>) {
    if (e.key !== 'Enter' && e.key !== 'Tab') return;
    e.preventDefault();
    const idx = steps.findIndex((s) => s.wrap === wrap);
    const next = steps[idx + 1];
    if (!next) {
      // Fin del formulario: enfocar el botón Guardar.
      const btn = shellRef.current?.querySelector<HTMLButtonElement>('.exp-form-save');
      btn?.focus();
      return;
    }
    // Abre la sección destino (si está cerrada) y enfoca tras el re-render.
    setOpenSection(next.section);
    requestAnimationFrame(() => {
      next.wrap.current?.querySelector<HTMLElement>('input,select,textarea')?.focus();
    });
  }

  /**
   * Recolecta los datos del gasto (cálculo real, sin tocar Componentes).
   * Devuelve null si no hay nada cargado.
   */
  function collectData(): Omit<Expense, 'id' | 'monthId'> | null {
    const estimatedArs =
      arsMode === 'estimate' && form.estimatedArs !== ''
        ? parseLocalNumber(form.estimatedArs)
        : null;
    const amountUsd = form.amountUsd !== '' ? (parseLocalNumber(form.amountUsd) ?? 0) : 0;
    const usdRate = form.usdRate === '' ? 0 : (parseLocalNumber(form.usdRate) ?? 0);
    const hasConfirmedUsd = usdExpanded && usdMode === 'real' && amountUsd > 0 && usdRate > 0;

    const amountArs =
      arsMode === 'estimate' || form.amountArs === ''
        ? hasConfirmedUsd
          ? 0
          : null
        : parseLocalNumber(form.amountArs);

    if (amountArs == null && estimatedArs == null && amountUsd === 0) return null;

    return {
      name: form.name.trim(),
      category: form.category,
      amountArs,
      estimatedArs,
      amountUsd,
      usdRate,
      dueDate: form.dueDate || null,
      paid: form.paid,
      notes: form.notes.trim(),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = collectData();
    if (!data) return;
    if (!confirmOpen) {
      // Primera pasada: mostrar resumen para confirmar.
      setPendingSave(data);
      setConfirmOpen(true);
      return;
    }
    onSave(data);
  }

  function confirmAndSave() {
    if (!pendingSave) return;
    onSave(pendingSave);
    setConfirmOpen(false);
  }

  return (
    <>
      {/* Overlay blurreado: tocar afuera cierra el modal */}
      <div className="exp-form-ov" onClick={onCancel} />

      {/* Shell modal: ventana centrada con el fondo del menú contextual */}
      <div className="exp-form-shell" role="dialog" aria-modal="true" ref={shellRef}>
        {/* Overlay de carga mientras se escanea */}
        {scanning && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 rounded-[22px] bg-black/40 backdrop-blur-sm">
            <div className="w-11 h-11 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
            <div className="text-sm font-semibold text-white">Escaneando factura…</div>
            <div className="text-[11px] text-white/60">Leyendo la foto para autocompletar</div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="exp-form">
          {/* Header: título + escanear (icono) + cerrar */}
          <header className="exp-form-head">
            <span className="exp-form-head-ic">
              <Icon name={initial ? 'pencil' : 'plus'} size={17} strokeWidth={2.2} />
            </span>
            <div className="text-sm font-bold text-[var(--txt)]">{initial ? 'Editar gasto' : 'Agregar gasto'}</div>
            <button
              type="button"
              className="exp-form-scan"
              onClick={() => fileRef.current?.click()}
              disabled={scanning}
              aria-label="Escanear factura"
              title="Escanear factura"
            >
              <Icon name="scan" size={18} />
            </button>
            <button type="button" className="exp-form-x" onClick={onCancel} aria-label="Cancelar" title="Cancelar">
              <Icon name="x" size={15} />
            </button>
          </header>

          {/* Scroll interno del form */}
          <div className="exp-form-scroll">
          {/* Sección 1: Datos básicos */}
            <Section
              icon="tag"
              title="Datos básicos"
              open={openSection === 'basicos'}
              onToggle={() => toggleSection('basicos')}
            >
              <div ref={nameWrap}>
                <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Nombre *</label>
                <InputBase
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                  placeholder="Ej: Alquiler"
                  enterKeyHint="next"
                  onKeyDown={(e) => handleNext(e, nameWrap)}
                />
              </div>
              <div ref={catWrap} className="mt-2">
                <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Categoría</label>
                <SelectBase
                  value={form.category}
                  onChange={(e) => set('category', e.target.value as Category)}
                  onKeyDown={(e) => handleNext(e, catWrap)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                  ))}
                </SelectBase>
              </div>
            </Section>

            {/* Sección 2: Montos (card única ultra compacta) */}
            <Section
              icon="wallet"
              title="Montos"
              open={openSection === 'montos'}
              onToggle={() => toggleSection('montos')}
            >
              <div className="mono-card">
                {/* Fila 1: ARS (badge flotante). Sin "Estimado" activo es monto real. */}
                <div className="mono-row1">
                  <div className="cur-sel" ref={arsWrap}>
                    <span className="cur-badge">
                      <Icon name="dollar" size={10} strokeWidth={2.5} /> AR$
                      <Icon name="chevronDown" size={9} />
                    </span>
                    <MoneyInput
                      symbol="$"
                      value={form.amountArs}
                      onChange={(v) => set('amountArs', v)}
                      placeholder="688.000"
                      estimate={arsMode === 'estimate'}
                      enterKeyHint="next"
                      onKeyDown={(e) => handleNext(e, arsWrap)}
                      className="pl-7"
                    />
                  </div>
                </div>

                {/* Fila 2: Pagado · Pte · Estimado ··· u$d */}
                <div className="mono-row2">
                  <div className="state-mini">
                    <button
                      type="button"
                      className={form.paid ? 'on-success' : ''}
                      onClick={() => set('paid', true)}
                    >
                      <Icon name="check" size={11} strokeWidth={2.5} />Pagado
                    </button>
                    <button
                      type="button"
                      className={!form.paid ? 'on-warn' : ''}
                      onClick={() => set('paid', false)}
                    >
                      <Icon name="clock" size={11} strokeWidth={2.5} />Pendiente
                    </button>
                    <button
                      type="button"
                      className={miniChipClass(arsMode === 'estimate')}
                      onClick={() => setArsMode(arsMode === 'estimate' ? 'real' : 'estimate')}
                      aria-pressed={arsMode === 'estimate'}
                    >
                      <Icon name="alert" size={11} strokeWidth={2.5} />Estimado
                    </button>
                  </div>
                  <span className="flex-1" />
                  <button
                    type="button"
                    className={`chip ${usdExpanded ? 'on-curr' : ''}`}
                    onClick={toggleUsd}
                    aria-expanded={usdExpanded}
                  >
                    <Icon name={usdExpanded ? 'x' : 'plus'} size={11} strokeWidth={2.5} />u$d
                  </button>
                </div>

                {arsMode === 'estimate' && (
                  <div className="hint-amber">
                    <Icon name="alert" size={10} />
                    <span>Estás cargando una estimación. No se sumará hasta que confirmes el monto real.</span>
                  </div>
                )}

                {/* USD inline: se expande dentro de la MISMA card */}
                <div className={`usd-inline ${usdExpanded ? 'open' : ''}`}>
                  <div className="usd-pad">
                    <div className="mono-row1" ref={usdAmtWrap}>
                      <div className="cur-sel">
                        <MoneyInput
                          symbol="u$d"
                          value={form.amountUsd}
                          onChange={handleAmountUsdChange}
                          placeholder="10,90"
                          estimate={usdMode === 'estimate'}
                          enterKeyHint="next"
                          onKeyDown={(e) => handleNext(e, usdAmtWrap)}
                          className="pl-10"
                        />
                      </div>
                      <button
                        type="button"
                        className={miniChipClass(usdMode === 'estimate')}
                        onClick={() => setUsdMode(usdMode === 'estimate' ? 'real' : 'estimate')}
                        aria-pressed={usdMode === 'estimate'}
                      >
                        <Icon name="alert" size={11} strokeWidth={2.5} />Estimado
                      </button>
                    </div>
                    <div className="mt-2" ref={usdRateWrap}>
                      <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                        Cotización USD ($){usdMode === 'real' && hasUsd && <span className="text-accent-amber"> (requerido)</span>}
                      </label>
                      <MoneyInput
                        symbol="$"
                        value={form.usdRate}
                        onChange={(v) => set('usdRate', v)}
                        placeholder="1.200"
                        required={usdMode === 'real' && hasUsd}
                        estimate={usdMode === 'estimate'}
                        enterKeyHint="next"
                        onKeyDown={(e) => handleNext(e, usdRateWrap)}
                        className="pl-7"
                      />
                      {usdMode === 'real' && hasUsd && (
                        <div className="hint-amber">
                          <Icon name="alert" size={10} />requerido si hay USD
                        </div>
                      )}
                    </div>
                    {usdMode === 'estimate' && (
                      <div className="hint-amber">
                        <Icon name="alert" size={10} />
                        <span>No se sumará hasta que confirmes el monto real.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Section>

            {/* Sección 3: Extras */}
            <Section
              icon="paperclip"
              title="Extras"
              open={openSection === 'extras'}
              onToggle={() => toggleSection('extras')}
            >
              <div ref={dueWrap}>
                <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Vencimiento</label>
                <InputBase
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                  onKeyDown={(e) => handleNext(e, dueWrap)}
                />
              </div>
              <div ref={notesWrap} className="mt-2">
                <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">Notas</label>
                <InputBase
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Opcional"
                  enterKeyHint="next"
                  onKeyDown={(e) => handleNext(e, notesWrap)}
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
          </div>

          {/* Footer fijo: Cancelar (ghost) + Guardar (primario) */}
          <footer className="exp-form-footer">
            <div className="flex-1">
              <Button variant="ghost" onClick={onCancel} fullWidth>
                Cancelar
              </Button>
            </div>
            <div className="flex-1">
              <Button type="submit" className="exp-form-save inline-flex items-center justify-center gap-1.5" fullWidth>
                <Icon name="check" size={16} />Guardar
              </Button>
            </div>
          </footer>
        </form>

        {/* Mini modal de confirmación con el resumen */}
        {confirmOpen && pendingSave && (
          <div className="confirm-ov" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-modal">
              <h3>
                <span className="confirm-ic"><Icon name="check" size={14} strokeWidth={3} /></span>
                Confirmar gasto
              </h3>
              <div className="confirm-list">
                <div className="confirm-item">
                  <span className="k">Nombre</span>
                  <span className="v">{pendingSave.name || '—'}</span>
                </div>
                <div className="confirm-item">
                  <span className="k">Categoría</span>
                  <span className="v">{CATEGORY_LABELS[pendingSave.category]}</span>
                </div>
                <div className="confirm-item">
                  <span className="k">Monto ARS</span>
                  <span className={`v ${pendingSave.amountArs == null ? 'est' : ''}`}>
                    {pendingSave.amountArs != null
                      ? fmtARS(pendingSave.amountArs)
                      : pendingSave.estimatedArs != null
                        ? `~${fmtARS(pendingSave.estimatedArs)}`
                        : '—'}
                  </span>
                </div>
                {pendingSave.amountUsd > 0 && (
                  <div className="confirm-item">
                    <span className="k">USD</span>
                    <span className="v">
                      {fmtUSD(pendingSave.amountUsd)}
                      {pendingSave.usdRate > 0 ? ` × ${fmtARS(pendingSave.usdRate)}` : ''}
                    </span>
                  </div>
                )}
                <div className="confirm-item">
                  <span className="k">Estado</span>
                  <span className="v">{pendingSave.paid ? 'Pagado' : 'Pendiente'}</span>
                </div>
                <div className="confirm-item total">
                  <span className="k">Total estimado</span>
                  <span className="v">{fmtARS(getExpenseTotal(pendingSave as Expense), 0)}</span>
                </div>
              </div>
              <div className="confirm-actions">
                <Button variant="ghost" onClick={() => setConfirmOpen(false)} fullWidth>
                  Volver
                </Button>
                <Button onClick={confirmAndSave} className="inline-flex items-center justify-center gap-1.5" fullWidth>
                  <Icon name="check" size={14} />Guardar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}