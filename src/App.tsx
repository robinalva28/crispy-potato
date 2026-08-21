import { useEffect, useRef, useState } from 'react';
import { db } from './db.ts';
import type { Category, Expense, Month, SavingsGoal, View } from './types.ts';
import { useBudget, monthLabelFromId } from './hooks/useBudget.ts';
import { useSavings } from './hooks/useSavings.ts';
import { useDarkMode } from './hooks/useDarkMode.ts';
import { MonthSelector, type MonthSelectorHandle } from './components/MonthSelector.tsx';
import { ExpenseRow } from './components/ExpenseRow.tsx';
import { ExpenseGroup } from './components/ExpenseGroup.tsx';
import { CategoryBars } from './components/CategoryBars.tsx';
import { ExpenseForm } from './components/ExpenseForm.tsx';
import { PhotoExpenseModal } from './components/PhotoExpenseModal.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { MoreSheet } from './components/MoreSheet.tsx';
import { ExpenseContextMenu, type ExpenseRect } from './components/ExpenseContextMenu.tsx';
import { ExpenseDetailModal } from './components/ExpenseDetailModal.tsx';
import { Modal } from './components/ui/Modal.tsx';
import { Button } from './components/ui/Button.tsx';
import { Icon } from './components/ui/Icon.tsx';
import type { ExpenseDraft } from './utils/photoExtract.ts';
import { canUsePhoto } from './utils/monthUtils.ts';
import { GuideModal } from './components/GuideModal.tsx';
import { EmptyState } from './components/EmptyState.tsx';
import { SavingsCalculator } from './components/SavingsCalculator.tsx';
import { SavingsGoalForm } from './components/SavingsGoalForm.tsx';
import { MoneyInput } from './components/MoneyInput.tsx';
import { parseLocalNumber, formatInputNumber } from './utils/format.ts';
import { openSearch, closeSearch, hideSearchFromScroll } from './utils/search.ts';
import {
  categoryTotals,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getExpenseTotal,
  fmtARS,
  fmtUSD,
  filterExpensesByText,
  confirmedTotal,
  projectedTotal,
  remaining,
  paidTotal,
  unpaidTotal,
} from './utils/money.ts';
import { playSound, playVibration } from './utils/feedback.ts';
import {
  useFeedback,
  soundEnabledFromStorage,
  vibrationEnabledFromStorage,
  SOUND_KEY,
  VIBRATION_KEY,
} from './hooks/useFeedback.ts';

interface EditingState {
  expense: Expense | null;
  adding: boolean;
}

interface EditingMonthState {
  month: Month;
  label: string;
  income: string;
}

export default function App() {
  const budget = useBudget();
  const savings = useSavings();
  const { dark, toggle } = useDarkMode();
  const [soundEnabled, setSoundEnabled] = useState(() => soundEnabledFromStorage());
  const [vibrationEnabled, setVibrationEnabled] = useState(() => vibrationEnabledFromStorage());
  const fdb = useFeedback(soundEnabled, vibrationEnabled);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    } catch {
      // localStorage no disponible: ignorar
    }
    // Preview: al activar se escucha y se siente un sample de éxito
    if (next) playSound('success');
  }

  function toggleVibration() {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    try {
      localStorage.setItem(VIBRATION_KEY, next ? '1' : '0');
    } catch {
      // localStorage no disponible: ignorar
    }
    // Preview: al activar se siente un sample háptico de éxito
    if (next) playVibration('success');
  }

  /** CTA "Probar ahora" de la guía: cierra el modal y dispara la acción real. */
  function handleGuideAction(action: string) {
    setShowGuide(false);
    setShowSavingsGuide(false);
    switch (action) {
      case 'create-month':
        setView('budget');
        monthSelectorRef.current?.openCreate();
        break;
      case 'add-expense':
      case 'scan':
        setView('budget');
        if (activeMonth && activeMonth.status === 'abierto') {
          setEditing({ expense: null, adding: true });
        } else if (!activeMonth) {
          monthSelectorRef.current?.openCreate();
        } else {
          setMoreOpen(true);
        }
        break;
      case 'photo':
        setView('budget');
        if (activeMonth) setShowPhotoModal(true);
        else monthSelectorRef.current?.openCreate();
        break;
      case 'organize':
      case 'close-month':
      case 'export':
        setView('budget');
        setMoreOpen(true);
        break;
      case 'savings':
        setView('savings');
        break;
    }
  }
  const [view, setView] = useState<View>('budget');
  const [fabOpen, setFabOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingMonth, setEditingMonth] = useState<EditingMonthState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const appScrollRef = useRef<HTMLDivElement | null>(null);
  const searchWrapRef = useRef<HTMLDivElement | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<Expense | null>(null);
  const [confirmAmountValue, setConfirmAmountValue] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showSavingsGuide, setShowSavingsGuide] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Partial<Record<Category, string>>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState<Month | null>(null);
  const [focusExpenseId, setFocusExpenseId] = useState<number | null>(null);
  const [contextExpense, setContextExpense] = useState<Expense | null>(null);
  const [contextRect, setContextRect] = useState<ExpenseRect | null>(null);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);
  const monthSelectorRef = useRef<MonthSelectorHandle | null>(null);

  const { activeMonth } = budget;
  const filteredExpenses = filterExpensesByText(budget.monthExpenses, searchQuery);
  const monthBudgets = activeMonth?.categoryBudgets ?? {};
  const photoAllowed = canUsePhoto(activeMonth);
  const monthClosed = activeMonth?.status === 'cerrado';
  const overlayOpen = fabOpen || moreOpen || contextExpense != null;
  // Hay gastos "por confirmar" (estimados) si algún gasto no tiene monto real
  const hasEstimated = activeMonth
    ? budget.monthExpenses.some((e) => e.amountArs == null)
    : false;

  // Se calculan los totales del mes activo (stats fijas del header)
  const confirmed = activeMonth ? confirmedTotal(activeMonth.id, budget.monthExpenses) : 0;
  const projected = activeMonth ? projectedTotal(activeMonth.id, budget.monthExpenses) : 0;
  const rest = activeMonth ? remaining(activeMonth, budget.monthExpenses) : 0;
  const paid = activeMonth ? paidTotal(activeMonth.id, budget.monthExpenses) : 0;
  const unpaid = activeMonth ? unpaidTotal(activeMonth.id, budget.monthExpenses) : 0;
  const headerTitle = `${activeMonth ? `${activeMonth.label} · ` : ''}${view === 'budget' ? 'Presupuesto' : 'Ahorro'}`;

  /** Cierra todos los paneles flotantes (speed dial, sheet, menú contextual). */
  function closePanels() {
    setFabOpen(false);
    setMoreOpen(false);
    setContextExpense(null);
    setContextRect(null);
  }

  // Guía de uso: aparece automáticamente la primera vez que se abre la app
  useEffect(() => {
    if (localStorage.getItem('pe-guided') !== '1') {
      setShowGuide(true);
      localStorage.setItem('pe-guided', '1');
    }
  }, []);

  // Guía de ahorro: aparece la primera vez que se entra a la vista 💰
  useEffect(() => {
    if (view === 'savings' && localStorage.getItem('pe-guided-savings') !== '1') {
      setShowSavingsGuide(true);
      localStorage.setItem('pe-guided-savings', '1');
    }
  }, [view]);

  // (El form de gasto es un modal centrado que vive FUERA del <main>, junto a
  // los overlays fixed. Ver su render al final del componente.)

  // Tras guardar/editar un gasto, scrollea hasta su fila y dispara el efecto
  // de recompensa "Snap + anillo" (efecto elegido en el preview, opción C).
  // El anillo (.exp-row-ring) vive en la fila; acá solo se agrega .effC-exp
  // una vez que el scroll llegó, y se limpia al terminar las animaciones.
  useEffect(() => {
    if (focusExpenseId == null) return;
    const timer = setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-expense-id="${focusExpenseId}"]`);
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Espera que el scroll smooth termine antes de disparar el efecto
      setTimeout(() => {
        row?.classList.add('effC-exp');
        setTimeout(() => row?.classList.remove('effC-exp'), 1400);
      }, 450);
      setFocusExpenseId(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [focusExpenseId]);

  useEffect(() => {
    if (!searchOpen || !searchWrapRef.current || !appScrollRef.current) return;
    const target = searchWrapRef.current;
    const root = appScrollRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            const next = hideSearchFromScroll({ open: true, query: '' });
            setSearchOpen(next.open);
            setSearchQuery(next.query);
          }
        }
      },
      { root, threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [searchOpen]);

  // --- Export / Import ---
  /** Exporta TODO: meses, gastos y segmentos de ahorro (backup completo). */
  async function exportJSON() {
    const [months, expenses, savingsRows] = await Promise.all([
      db.months.toArray(),
      db.expenses.toArray(),
      db.savings.toArray(),
    ]);
    const jsonContent = JSON.stringify({ months, expenses, savings: savingsRows }, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await db.transaction('rw', db.months, db.expenses, db.savings, async () => {
        if (Array.isArray(data.months)) await db.months.bulkPut(data.months);
        if (Array.isArray(data.expenses)) await db.expenses.bulkPut(data.expenses);
        if (Array.isArray(data.savings)) await db.savings.bulkPut(data.savings);
      });
      // Refrescar estado sin recargar la página
      await budget.refresh();
      await savings.refresh();
    } catch (err) {
      alert('JSON inválido');
    }
  }

  // --- Edición de mes ---
  async function saveMonth(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMonth) return;
    const income = parseLocalNumber(editingMonth.income) ?? 0;
    if (income < 0) return;
    await budget.updateMonth(editingMonth.month.id, {
      label: editingMonth.label || monthLabelFromId(editingMonth.month.id),
      income,
    });
    setEditingMonth(null);
    fdb.edit();
  }

  // --- CRUD gastos ---
  async function saveExpense(data: Omit<Expense, 'id' | 'monthId'>) {
    if (editing?.expense) {
      await budget.updateExpense(editing.expense.id!, data);
      setFocusExpenseId(editing.expense.id!);
      fdb.edit();
    } else {
      const id = await budget.addExpense(data);
      if (id != null) setFocusExpenseId(id);
      fdb.success();
    }
    setEditing(null);
  }

  /** Pide confirmación antes de borrar (evita borrar sin querer). */
  function requestDelete(id: number) {
    const expense = budget.monthExpenses.find((e) => e.id === id);
    if (expense) setConfirmDelete(expense);
  }

  async function confirmExpenseDelete() {
    if (!confirmDelete) return;
    const id = confirmDelete.id!;
    setConfirmDelete(null);
    await budget.deleteExpense(id);
    fdb.delete();
  }

  /** Elimina un mes y todos sus gastos (con confirmación previa). */
  async function confirmMonthDelete() {
    if (!confirmDeleteMonth) return;
    const id = confirmDeleteMonth.id;
    setConfirmDeleteMonth(null);
    setEditingMonth(null);
    await budget.deleteMonth(id);
    fdb.delete();
  }

  /** Duplica un gasto (para gastos fijos mensuales). La copia arranca sin pagar. */
  async function handleDuplicate(id: number) {
    const expense = budget.monthExpenses.find((e) => e.id === id);
    if (!expense) return;
    await budget.addExpense({
      name: `${expense.name} (copia)`,
      category: expense.category,
      amountArs: expense.amountArs,
      estimatedArs: expense.estimatedArs,
      amountUsd: expense.amountUsd,
      usdRate: expense.usdRate,
      dueDate: expense.dueDate,
      paid: false,
      notes: expense.notes,
    });
    fdb.edit();
  }

  /**
   * Toggle de pagado: si el gasto tiene amountArs null (por confirmar),
   * abre un modal para confirmar el monto real antes de marcar pagado.
   * Si ya tiene monto real, hace el toggle normal.
   */
  function handleTogglePaid(id: number) {
    const expense = budget.monthExpenses.find((e) => e.id === id);
    if (!expense) return;
    if (expense.amountArs == null) {
      setConfirmAmount(expense);
      setConfirmAmountValue(
        expense.estimatedArs != null ? formatInputNumber(expense.estimatedArs) : ''
      );
      return;
    }
    budget.togglePaid(id);
    fdb.toggle();
  }

  /** Confirma el monto real del gasto "por confirmar" y lo marca como pagado. */
  async function confirmEstimatedAmount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmAmount) return;
    const parsed = parseLocalNumber(confirmAmountValue);
    if (parsed == null || parsed < 0) return;
    await budget.updateExpense(confirmAmount.id!, {
      amountArs: parsed,
      paid: true,
    });
    setConfirmAmount(null);
    fdb.success();
  }

  /** Abre el modal de presupuestos con los valores actuales del mes. */
  function openBudgetEditor() {
    if (!activeMonth) return;
    const inputs: Partial<Record<Category, string>> = {};
    for (const cat of CATEGORY_ORDER) {
      const val = activeMonth.categoryBudgets?.[cat];
      inputs[cat] = val != null ? formatInputNumber(val) : '';
    }
    setBudgetInputs(inputs);
    setEditingBudgets(true);
  }

  /**
   * Guarda los gastos detectados por foto (REEMPLAZO ENTERO del mes).
   * - Borra todos los gastos existentes del mes.
   * - Agrega los gastos de la foto.
   * - Marca source='photo' y photoReplacements=1 (máximo 1 reemplazo).
   */
  async function handlePhotoSave(drafts: ExpenseDraft[], monthId: string) {
    if (!canUsePhoto(activeMonth)) return;

    await db.transaction('rw', db.months, db.expenses, async () => {
      await db.expenses.where('monthId').equals(monthId).delete();
      await db.expenses.bulkAdd(
        drafts
          .filter((d) => d.name.trim() !== '')
          .map((d) => ({
            monthId,
            name: d.name.trim(),
            category: d.category as Category,
            amountArs: d.amountArs,
            estimatedArs: null,
            amountUsd: d.amountUsd || 0,
            usdRate: d.usdRate || 0,
            dueDate: null,
            paid: false,
            notes: d.notes.trim(),
          }))
      );
      await db.months.update(monthId, { source: 'photo', photoReplacements: 1 });
    });

    await budget.refresh();
    fdb.success();
  }

  /** Guarda los presupuestos por categoría del mes activo. */
  async function saveBudgets(e: React.FormEvent) {
    e.preventDefault();
    if (!activeMonth) return;
    const categoryBudgets: Partial<Record<Category, number>> = {};
    for (const cat of CATEGORY_ORDER) {
      const raw = budgetInputs[cat]?.trim();
      if (raw) {
        const val = parseLocalNumber(raw);
        if (val != null && val > 0) categoryBudgets[cat] = val;
      }
    }
    await budget.updateMonth(activeMonth.id, { categoryBudgets });
    setEditingBudgets(false);
    fdb.edit();
  }

  // --- CRUD segmentos de ahorro ---
  async function saveGoal(data: Omit<SavingsGoal, 'id'>) {
    if (editingGoal?.id) {
      await savings.updateGoal(editingGoal.id, data);
      fdb.edit();
    } else {
      await savings.addGoal(data);
      fdb.success();
    }
    setEditingGoal(null);
    setAddingGoal(false);
  }

  if (budget.loading) {
    return (
      <div className="max-w-md mx-auto my-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Cargando…
      </div>
    );
  }

  return (
    <>
    <main className="max-w-md mx-auto glass-card app-shell">
      {/* HEADER FIJO v4: título + mes + resto + ✎ · chips de meses · stats */}
      <header className="v4-hdr px-4 pt-3">
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <div className="text-[15px] font-bold tracking-tight truncate min-w-0">
            {headerTitle}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {view === 'budget' && activeMonth && (
              <div className="text-xs font-semibold tabular-nums text-accent-lime whitespace-nowrap">
                Resto {fmtARS(rest, 0)}
              </div>
            )}
            <button
              type="button"
              className="icon-btn-v4"
              onClick={() => {
                if (activeMonth && activeMonth.status === 'abierto') {
                  setEditingMonth({
                    month: activeMonth,
                    label: activeMonth.label,
                    income: formatInputNumber(activeMonth.income),
                  });
                }
              }}
              aria-label="Editar mes"
              title="Editar mes"
            >
              <Icon name="pencil" size={18} ariaHidden />
            </button>
          </div>
        </div>

        {view === 'budget' && (
          <div className="-mx-2">
            <MonthSelector
              ref={monthSelectorRef}
              months={budget.months}
              activeMonthId={budget.activeMonthId}
              onSelect={budget.setActiveMonthId}
              onCreate={async (input) => {
                await budget.createMonth(input);
                fdb.success();
              }}
            />
          </div>
        )}

        {view === 'budget' && activeMonth && (
          <>
            {/* Stats condicionales: solo muestran Confirmado/Proyectado cuando hay estimados.
                Sin estimados → Gastado + Ingreso (sin ruido). */}
            <div className="hdr-cond-stats">
              {hasEstimated ? (
                <>
                  <span>Confirmado <b>{fmtARS(confirmed, 0)}</b></span>
                  <span>+ estimados <b className="text-accent-amber">{fmtARS(projected - confirmed, 0)}</b></span>
                  <span>→ Proyectado <b>{fmtARS(projected, 0)}</b></span>
                </>
              ) : (
                <>
                  <span>Gastado <b>{fmtARS(confirmed, 0)}</b></span>
                  <span>·</span>
                  <span>Ingreso <b>{fmtARS(activeMonth.income, 0)}</b></span>
                </>
              )}
            </div>

            {/* Barra Pagado vs Pendiente en el header: textos arriba + barra completa abajo */}
            {projected > 0 && (
              <div className="hdr-progress">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-emerald inline-block"></span>
                    <span className="opacity-50 font-medium">Pagado</span>
                    <span className="font-bold tabular-nums opacity-80">{fmtARS(paid, 0)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-amber inline-block"></span>
                    <span className="opacity-50 font-medium">Pendiente</span>
                    <span className="font-bold tabular-nums opacity-80">{fmtARS(unpaid, 0)}</span>
                  </div>
                </div>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-white/60 dark:bg-white/10">
                  <div
                    className="h-full bg-accent-emerald transition-all"
                    style={{ width: `${Math.min((paid / projected) * 100, 100)}%` }}
                  />
                  <div
                    className="h-full bg-accent-amber transition-all"
                    style={{ width: `${Math.min((unpaid / projected) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </header>

      {/* SCROLL interno: solo el contenido cambia según la vista */}
      <div className="app-scroll" ref={appScrollRef}>
        {view === 'budget' && (
          <div className="px-3 pt-1 pb-1 space-y-2">
            {activeMonth && (
              <>
                {budget.monthExpenses.length === 0 && (
                  <EmptyState
                    icon="clipboard"
                    title="Todavía no hay gastos"
                    text="Cargá tu primer gasto, escaneá una factura o sacá una foto de tus apuntes."
                    actions={[
                      {
                        key: 'add',
                        label: 'Agregar gasto',
                        icon: 'plus',
                        onClick: () => setEditing({ expense: null, adding: true }),
                      },
                      {
                        key: 'photo',
                        label: 'Foto de apuntes',
                        icon: 'camera',
                        variant: 'violet',
                        onClick: () => setShowPhotoModal(true),
                      },
                    ]}
                  />
                )}
                {budget.monthExpenses.length > 0 && searchOpen && (
                  <div className="app-scroll-sticky search-wrap" ref={searchWrapRef}>
                    <div className="glass rounded-full px-4 py-2 flex items-center gap-2 search-box">
                      <Icon name="search" size={16} className="opacity-40 shrink-0" ariaHidden />
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar gasto…"
                        autoFocus
                        className="w-full bg-transparent text-sm outline-none placeholder:opacity-50"
                      />
                    </div>
                  </div>
                )}
                {searchQuery.trim() !== '' && filteredExpenses.length === 0 && (
                  <div className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Sin resultados para "{searchQuery.trim()}"
                  </div>
                )}
                {!groupByCategory && (
                  <div className="space-y-2">
                    {filteredExpenses.map((expense) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        onTogglePaid={activeMonth.status === 'abierto' ? handleTogglePaid : () => {}}
                        onDelete={activeMonth.status === 'abierto' ? requestDelete : () => {}}
                        onDuplicate={activeMonth.status === 'abierto' ? handleDuplicate : () => {}}
                        onEdit={(exp) => {
                          if (activeMonth.status === 'abierto') setEditing({ expense: exp, adding: false });
                        }}
                        onContextMenu={
                          activeMonth.status === 'abierto'
                            ? (exp, e) => {
                                const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                setContextExpense(exp);
                                setContextRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                                setFabOpen(false);
                                setMoreOpen(false);
                              }
                            : undefined
                        }
                      />
                    ))}
                  </div>
                )}
                {groupByCategory && (
                  <div className="space-y-2">
                    {activeMonth.status === 'abierto' && (
                      <CategoryBars totals={categoryTotals(activeMonth.id, budget.monthExpenses)} budgets={monthBudgets} />
                    )}
                    {CATEGORY_ORDER.map((cat) => {
                      const catExpenses = filteredExpenses.filter((e) => e.category === cat);
                      if (catExpenses.length === 0) return null;
                      const totals = categoryTotals(activeMonth.id, filteredExpenses);
                      return (
                        <ExpenseGroup
                          key={cat}
                          category={cat}
                          expenses={catExpenses}
                          total={totals.get(cat) ?? 0}
                          onTogglePaid={activeMonth.status === 'abierto' ? handleTogglePaid : () => {}}
                          onDelete={activeMonth.status === 'abierto' ? requestDelete : () => {}}
                          onDuplicate={activeMonth.status === 'abierto' ? handleDuplicate : () => {}}
                          onEdit={(exp) => {
                            if (activeMonth.status === 'abierto') setEditing({ expense: exp, adding: false });
                          }}
                          onContextMenu={
                            activeMonth.status === 'abierto'
                              ? (exp, e) => {
                                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                  setContextExpense(exp);
                                  setContextRect({ top: r.top, left: r.left, width: r.width, height: r.height });
                                  setFabOpen(false);
                                  setMoreOpen(false);
                                }
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!activeMonth && (
              <EmptyState
                icon="calendar"
                title="Empezá por tu primer mes"
                text="Creá el mes con tu ingreso. Después agregás gastos o sacás una foto de tus apuntes."
                actions={[
                  {
                    key: 'create',
                    label: 'Crear mes',
                    icon: 'plus',
                    onClick: () => monthSelectorRef.current?.openCreate(),
                  },
                ]}
              />
            )}

            {budget.lastDeleted && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm px-4 py-3 bg-neutral-900 text-white rounded-xl shadow-lg flex items-center justify-between gap-3 dark:bg-neutral-100 dark:text-neutral-900">
                <span className="text-sm">Gasto eliminado</span>
                <button
                  type="button"
                  onClick={() => {
                    void budget.restoreLastDeleted();
                    fdb.undo();
                  }}
                  className="text-sm font-semibold text-accent-emerald"
                >
                  Deshacer
                </button>
              </div>
            )}
          </div>
        )}

        {view === 'savings' && (
          <div className="pb-4">
            {(addingGoal || editingGoal) && (
              <SavingsGoalForm
                initial={editingGoal}
                months={budget.months}
                expenses={budget.expenses}
                onSave={saveGoal}
                onCancel={() => {
                  setEditingGoal(null);
                  setAddingGoal(false);
                }}
              />
            )}

            <SavingsCalculator
              goals={savings.goals}
              months={budget.months}
              expenses={budget.expenses}
              onAdd={() => {
                setEditingGoal(null);
                setAddingGoal(true);
              }}
              onEdit={(goal) => {
                setAddingGoal(false);
                setEditingGoal(goal);
              }}
              onDelete={(id) => {
                void savings.deleteGoal(id);
                fdb.delete();
              }}
              onRemoveExtra={savings.removeExtraIncome}
            />

            {/* Botón discreto de guía de ahorro, siempre visible abajo */}
            <div className="px-4">
              <button
                type="button"
                onClick={() => setShowSavingsGuide(true)}
                aria-label="Guía de ahorro"
                title="Guía de ahorro"
                className="w-full px-3 py-2.5 text-xs font-semibold glass rounded-full hover:opacity-80 transition"
              >
                <Icon name="help" size={14} className="inline-block mr-1 align-[-2px]" />Guía de ahorro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR v4: acceso directo a vistas · Más (el FAB vive fuera del main) */}
      <BottomNav
        view={view}
        onBudget={() => {
          setFabOpen(false);
          setMoreOpen(false);
          setView('budget');
        }}
        onMore={() => {
          setFabOpen(false);
          setMoreOpen((v) => !v);
        }}
        onSavings={() => {
          setFabOpen(false);
          setMoreOpen(false);
          setView('savings');
          const next = closeSearch();
          setSearchOpen(next.open);
          setSearchQuery(next.query);
        }}
        onSearch={() => {
          setFabOpen(false);
          setMoreOpen(false);
          setView('budget');
          const next = openSearch();
          setSearchOpen(next.open);
          setSearchQuery(next.query);
          requestAnimationFrame(() => {
            appScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }}
      />
    </main>

    {/* FAB + Speed Dial: fixed FUERA del main para no quedar bajo el overlay (z45) */}
    <div className="fab-shell">
      <div className={`sd ${fabOpen ? 'open' : ''}`}>
        <button type="button" className="si" onClick={() => { setFabOpen(false); if (activeMonth?.status === 'abierto') { setView('budget'); setEditing({ expense: null, adding: true }); } }}>
          <span className="ico grad-lime"><Icon name="plus" size={18} ariaHidden /></span>
          Agregar Gasto
        </button>
        <button type="button" className="si" onClick={() => { setFabOpen(false); if (activeMonth) { setView('budget'); setShowPhotoModal(true); } }}>
          <span className="ico grad-violet"><Icon name="camera" size={18} ariaHidden /></span>
          Foto de apuntes
        </button>
      </div>
      <button
        type="button"
        className={`fab ${fabOpen ? 'open' : ''}`}
        onClick={() => {
          setMoreOpen(false);
          setFabOpen((v) => !v);
        }}
        aria-label={fabOpen ? 'Cerrar acciones' : 'Agregar'}
        title="Agregar"
      >
        <Icon name="plus" size={36} strokeWidth={3} ariaHidden />
      </button>
    </div>

    {/* Overlay unificado: cierra cualquier panel abierto */}
    <div className={`ov-v4 ${overlayOpen ? 'open' : ''}`} onClick={closePanels} />

    {/* Form de gasto: modal centrado FUERA del main. El .glass-card crea un
        stacking context y una instancia así bloquearía el overlay (z85) por
        debajo del FAB (z60). Acá, en el contexto raíz, el blur tapa al FAB. */}
    {activeMonth && activeMonth.status === 'abierto' && editing && (
      <ExpenseForm
        initial={editing.expense}
        onSave={saveExpense}
        onCancel={() => setEditing(null)}
        onGetLastUsdRate={budget.getLastUsdRate}
      />
    )}

    <ExpenseDetailModal
      expense={detailExpense}
      onClose={() => setDetailExpense(null)}
    />

    {/* Menú contextual de gasto: card fantasma nítida + acciones flotantes */}
    {contextExpense && contextRect && activeMonth && activeMonth.status === 'abierto' && (
      <ExpenseContextMenu
        expense={contextExpense}
        rect={contextRect}
        onClose={closePanels}
        onDetails={() => {
          setDetailExpense(contextExpense);
          setContextExpense(null);
          setContextRect(null);
        }}
        onEdit={() => {
          setContextExpense(null);
          setContextRect(null);
          setEditing({ expense: contextExpense, adding: false });
        }}
        onDuplicate={() => {
          const id = contextExpense.id;
          setContextExpense(null);
          setContextRect(null);
          if (id != null) void handleDuplicate(id);
        }}
        onDelete={() => {
          const id = contextExpense.id;
          setContextExpense(null);
          setContextRect(null);
          if (id != null) requestDelete(id);
        }}
      />
    )}

    {/* Bottom sheet "Más" */}
    {activeMonth && (
      <MoreSheet
        open={moreOpen}
        dark={dark}
        soundEnabled={soundEnabled}
        vibrationEnabled={vibrationEnabled}
        monthClosed={monthClosed}
        onClose={() => setMoreOpen(false)}
        onGroupBy={() => setGroupByCategory((g) => !g)}
        onBudgets={openBudgetEditor}
        onReopenMonth={() => {
          if (!activeMonth) return;
          void budget.reopenMonth(activeMonth.id);
          fdb.reopenMonth();
        }}
        onCloseMonth={() => {
          if (!activeMonth) return;
          void budget.closeMonth(activeMonth.id);
          fdb.closeMonth();
        }}
        onGuide={() => setShowGuide(true)}
        onToggleTheme={toggle}
        onToggleSound={toggleSound}
        onToggleVibration={toggleVibration}
        onExport={() => void exportJSON()}
        onImport={(e) => void importJSON(e)}
      />
    )}

    {showPhotoModal && activeMonth && (
      <PhotoExpenseModal
        month={activeMonth}
        onSave={handlePhotoSave}
        onClose={() => setShowPhotoModal(false)}
      />
    )}

    <GuideModal
      open={showGuide}
      onClose={() => setShowGuide(false)}
      type="budget"
      onAction={handleGuideAction}
    />

    <GuideModal
      open={showSavingsGuide}
      onClose={() => setShowSavingsGuide(false)}
      type="savings"
      onAction={handleGuideAction}
    />

    {confirmAmount && (
      <Modal open onClose={() => setConfirmAmount(null)} icon="checkCircle" title="Confirmar gasto">
        <form onSubmit={confirmEstimatedAmount} className="space-y-3">

          {/* Contexto completo del gasto por confirmar */}
          <div className="glass rounded-xl p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Categoría</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {CATEGORY_LABELS[confirmAmount.category]}
              </span>
            </div>
            {confirmAmount.estimatedArs != null && (
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Estimado</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {fmtARS(confirmAmount.estimatedArs)}
                </span>
              </div>
            )}
            {confirmAmount.amountUsd > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Componente USD</span>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {fmtUSD(confirmAmount.amountUsd)} a {fmtARS(confirmAmount.usdRate)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 border-t border-neutral-200 dark:border-neutral-700">
              <span className="text-neutral-500 dark:text-neutral-400">Total estimado</span>
              <span className="font-bold text-neutral-900 dark:text-neutral-100">
                {fmtARS(getExpenseTotal(confirmAmount), 0)}
              </span>
            </div>
          </div>

          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-semibold">{confirmAmount.name}</span> estaba "por confirmar".
            Confirmá el monto real para marcarlo como pagado.
          </p>
          <div>
            <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
              Monto real (ARS)
            </label>
            <MoneyInput
              symbol="$"
              autoFocus
              value={confirmAmountValue}
              onChange={(v) => setConfirmAmountValue(v)}
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" fullWidth>
              Confirmar y marcar pagado
            </Button>
            <Button variant="ghost" onClick={() => setConfirmAmount(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    )}

    {confirmDelete && (
      <Modal open onClose={() => setConfirmDelete(null)} icon="trash" danger title="¿Eliminar gasto?">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Se borrará <span className="font-semibold">{confirmDelete.name}</span>. Vas a poder
          deshacerlo por unos segundos después de confirmar.
        </p>
        <div className="flex gap-2 pt-1">
          <Button variant="danger" fullWidth onClick={confirmExpenseDelete}>
            Sí, borrar
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    )}

    {confirmDeleteMonth && (
      <Modal open onClose={() => setConfirmDeleteMonth(null)} icon="lock" danger title="¿Eliminar mes?">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Se borrará <span className="font-semibold">{confirmDeleteMonth.label}</span> y TODOS
          sus gastos. Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-2 pt-1">
          <Button variant="danger" fullWidth onClick={confirmMonthDelete}>
            Sí, borrar mes
          </Button>
          <Button variant="ghost" onClick={() => setConfirmDeleteMonth(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    )}

    {editingBudgets && (
      <Modal open onClose={() => setEditingBudgets(false)} icon="settings" title="Presupuestos del mes">
        <form onSubmit={saveBudgets} className="space-y-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Definí un límite mensual por categoría (en ARS). Dejá vacío para no poner límite.
          </p>

          {CATEGORY_ORDER.map((cat) => (
            <div key={cat}>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                {CATEGORY_LABELS[cat]}
              </label>
              <MoneyInput
                symbol="$"
                value={budgetInputs[cat] ?? ''}
                onChange={(v) => setBudgetInputs({ ...budgetInputs, [cat]: v })}
                placeholder="Sin límite"
              />
            </div>
          ))}

          <div className="flex gap-2 pt-1">
            <Button type="submit" fullWidth>
              Guardar presupuestos
            </Button>
            <Button variant="ghost" onClick={() => setEditingBudgets(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    )}

    {editingMonth && (
      <Modal open onClose={() => setEditingMonth(null)} icon="calendar" title="Editar mes">
        <form onSubmit={saveMonth} className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="dangerGhost"
              size="sm"
              onClick={() => {
                const m = editingMonth.month;
                setEditingMonth(null);
                setConfirmDeleteMonth(m);
              }}
            >
              <Icon name="trash" size={14} className="inline-block mr-1 align-[-2px]" />Eliminar mes
            </Button>
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 font-medium mb-1">Etiqueta</label>
            <input
              value={editingMonth.label}
              onChange={(e) => setEditingMonth({ ...editingMonth, label: e.target.value })}
              className="input-aura w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-500 font-medium mb-1">Ingreso (ARS)</label>
            <MoneyInput
              symbol="$"
              value={editingMonth.income}
              onChange={(v) => setEditingMonth({ ...editingMonth, income: v })}
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" fullWidth>
              Guardar
            </Button>
            <Button variant="ghost" onClick={() => setEditingMonth(null)}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    )}
    </>
  );
}