import { useEffect, useRef, useState } from 'react';
import { db } from './db.ts';
import type { Category, Expense, Month, SavingsGoal, View } from './types.ts';
import { useBudget, monthLabelFromId } from './hooks/useBudget.ts';
import { useSavings } from './hooks/useSavings.ts';
import { useDarkMode } from './hooks/useDarkMode.ts';
import { MonthSelector } from './components/MonthSelector.tsx';
import { MonthHeader } from './components/MonthHeader.tsx';
import { ExpenseRow } from './components/ExpenseRow.tsx';
import { ExpenseGroup } from './components/ExpenseGroup.tsx';
import { CategoryBars } from './components/CategoryBars.tsx';
import { ExpenseForm } from './components/ExpenseForm.tsx';
import { PhotoExpenseModal } from './components/PhotoExpenseModal.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { ViewMenu } from './components/ViewMenu.tsx';
import { MoreSheet } from './components/MoreSheet.tsx';
import type { ExpenseDraft } from './utils/photoExtract.ts';
import { canUsePhoto } from './utils/monthUtils.ts';
import { GuideModal } from './components/GuideModal.tsx';
import { SavingsCalculator } from './components/SavingsCalculator.tsx';
import { SavingsGoalForm } from './components/SavingsGoalForm.tsx';
import { MoneyInput } from './components/MoneyInput.tsx';
import { parseLocalNumber, formatInputNumber } from './utils/format.ts';
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
} from './utils/money.ts';
import { feedback as playFeedback } from './utils/feedback.ts';
import {
  useFeedback,
  soundEnabledFromStorage,
  SOUND_KEY,
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
  const fdb = useFeedback(soundEnabled);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? '1' : '0');
    } catch {
      // localStorage no disponible: ignorar
    }
    // Preview: al activar se escucha y se siente un sample de éxito
    if (next) playFeedback('success');
  }
  const [view, setView] = useState<View>('budget');
  const [fabOpen, setFabOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingMonth, setEditingMonth] = useState<EditingMonthState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const [confirmAmount, setConfirmAmount] = useState<Expense | null>(null);
  const [confirmAmountValue, setConfirmAmountValue] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showSavingsGuide, setShowSavingsGuide] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [addingGoal, setAddingGoal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBudgets, setEditingBudgets] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState<Partial<Record<Category, string>>>({});
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [confirmDeleteMonth, setConfirmDeleteMonth] = useState<Month | null>(null);
  const expenseFormRef = useRef<HTMLDivElement | null>(null);

  const { activeMonth } = budget;
  const filteredExpenses = filterExpensesByText(budget.monthExpenses, searchQuery);
  const monthBudgets = activeMonth?.categoryBudgets ?? {};
  const photoAllowed = canUsePhoto(activeMonth);
  const monthClosed = activeMonth?.status === 'cerrado';
  const overlayOpen = fabOpen || viewMenuOpen || moreOpen;

  // Se calculan los totales del mes activo (stats fijas del header)
  const confirmed = activeMonth ? confirmedTotal(activeMonth.id, budget.monthExpenses) : 0;
  const projected = activeMonth ? projectedTotal(activeMonth.id, budget.monthExpenses) : 0;
  const rest = activeMonth ? remaining(activeMonth, budget.monthExpenses) : 0;
  const headerTitle = `${activeMonth ? `${activeMonth.label} · ` : ''}${view === 'budget' ? 'Presupuesto' : 'Ahorro'}`;

  /** Cierra todos los paneles flotantes (speed dial, mini menú, sheet). */
  function closePanels() {
    setFabOpen(false);
    setViewMenuOpen(false);
    setMoreOpen(false);
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

  // Al abrir el formulario de gasto (agregar/editar), scrollea hasta él
  useEffect(() => {
    if (editing) {
      expenseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editing]);

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
      fdb.edit();
    } else {
      await budget.addExpense(data);
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
    <main className="max-w-md mx-auto my-4 glass-card rounded-[28px] app-shell">
      {/* HEADER FIJO v4: título + mes + resto + ✎ · chips de meses · stats */}
      <header className="v4-hdr px-4 pt-3">
        <div className="flex items-center justify-between gap-2 min-h-[44px]">
          <div className="text-[15px] font-bold tracking-tight truncate min-w-0">
            {headerTitle}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {view === 'budget' && activeMonth && (
              <div className="text-xs font-semibold tabular-nums text-lime-700 dark:text-lime-400 whitespace-nowrap">
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
              ✎
            </button>
          </div>
        </div>

        {view === 'budget' && (
          <div className="-mx-2">
            <MonthSelector
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
          <div className="v4-stats">
            <div className="glass rounded-2xl px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-widest font-semibold opacity-50">Confirmado</div>
              <div className="text-[11px] font-extrabold tabular-nums mt-0.5">{fmtARS(confirmed, 0)}</div>
            </div>
            <div className="glass rounded-2xl px-2 py-2 text-center">
              <div className="text-[9px] uppercase tracking-widest font-semibold opacity-50">Proyectado</div>
              <div className="text-[11px] font-extrabold tabular-nums mt-0.5">{fmtARS(projected, 0)}</div>
            </div>
            <div
              className="rounded-2xl px-2 py-2 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(132,204,22,.14), rgba(16,185,129,.10))', border: '1px solid rgba(132,204,22,.22)' }}
            >
              <div className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#4d7c0f' }}>Resto</div>
              <div className="text-[11px] font-extrabold tabular-nums mt-0.5" style={{ color: '#4d7c0f' }}>{fmtARS(rest, 0)}</div>
            </div>
          </div>
        )}
      </header>

      {/* SCROLL interno: solo el contenido cambia según la vista */}
      <div className="app-scroll">
        {view === 'budget' && (
          <div className="px-3 pt-3 pb-4 space-y-2.5">
            {activeMonth && (
              <>
                {/* Hero compacto del mes */}
                <div className="px-1 pt-1 pb-1">
                  <MonthHeader
                    month={activeMonth}
                    expenses={budget.monthExpenses}
                    onEditMonth={() => {
                      if (activeMonth.status === 'abierto') {
                        setEditingMonth({
                          month: activeMonth,
                          label: activeMonth.label,
                          income: formatInputNumber(activeMonth.income),
                        });
                      }
                    }}
                    isClosed={monthClosed}
                  />
                </div>

                <div ref={expenseFormRef}>
                  {activeMonth.status === 'abierto' && editing && editing.expense !== null && (
                    <ExpenseForm
                      initial={editing.expense}
                      onSave={saveExpense}
                      onCancel={() => setEditing(null)}
                      onGetLastUsdRate={budget.getLastUsdRate}
                    />
                  )}

                  {activeMonth.status === 'abierto' && editing?.adding && (
                    <ExpenseForm
                      initial={null}
                      onSave={saveExpense}
                      onCancel={() => setEditing(null)}
                      onGetLastUsdRate={budget.getLastUsdRate}
                    />
                  )}
                </div>

                {budget.monthExpenses.length === 0 && (
                  <div className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Sin gastos todavía. Toque "+ Agregar Gasto".
                  </div>
                )}
                {budget.monthExpenses.length > 0 && (
                  <div className="app-scroll-sticky">
                    <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
                      <svg className="w-4 h-4 opacity-40 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"/></svg>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar gasto…"
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
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {!activeMonth && (
              <div className="py-10 text-center text-sm text-neutral-500 dark:text-neutral-400">
                Creá un mes para empezar a cargar gastos.
              </div>
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
                  className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 dark:text-emerald-600 dark:hover:text-emerald-500"
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
                ❓ Guía de ahorro
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BAR v4: selector de vista · Más (el FAB vive fuera del main) */}
      <BottomNav
        view={view}
        onToggleView={() => {
          setFabOpen(false);
          setMoreOpen(false);
          setViewMenuOpen((v) => !v);
        }}
        onMore={() => {
          setFabOpen(false);
          setViewMenuOpen(false);
          setMoreOpen((v) => !v);
        }}
      />
    </main>

    {/* FAB + Speed Dial: fixed FUERA del main para no quedar bajo el overlay (z45) */}
    <div className="fab-shell">
      <div className={`sd ${fabOpen ? 'open' : ''}`}>
        <button type="button" className="si" onClick={() => { setFabOpen(false); if (activeMonth?.status === 'abierto') { setView('budget'); setEditing({ expense: null, adding: true }); } }}>
          <span className="ico" style={{ background: 'linear-gradient(135deg,#65a30d,#84cc16)' }}>➕</span>
          Agregar Gasto
        </button>
        <button type="button" className="si" onClick={() => { setFabOpen(false); if (activeMonth) { setView('budget'); setShowPhotoModal(true); } }}>
          <span className="ico" style={{ background: 'linear-gradient(135deg,#8b5cf6,#d946ef)' }}>📷</span>
          Foto de apuntes
        </button>
      </div>
      <button
        type="button"
        className={`fab ${fabOpen ? 'open' : ''}`}
        onClick={() => {
          setViewMenuOpen(false);
          setMoreOpen(false);
          setFabOpen((v) => !v);
        }}
        aria-label={fabOpen ? 'Cerrar acciones' : 'Agregar'}
        title="Agregar"
      >
        +
      </button>
    </div>

    {/* Overlay unificado: cierra cualquier panel abierto */}
    <div className={`ov-v4 ${overlayOpen ? 'open' : ''}`} onClick={closePanels} />

    {/* Mini menú de vista (flotante sobre la bottom bar) */}
    <ViewMenu
      open={viewMenuOpen}
      view={view}
      onSelect={(v) => {
        setView(v);
        setViewMenuOpen(false);
      }}
    />

    {/* Bottom sheet "Más" */}
    {activeMonth && view === 'budget' && (
      <MoreSheet
        open={moreOpen}
        dark={dark}
        soundEnabled={soundEnabled}
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
    />

    <GuideModal
      open={showSavingsGuide}
      onClose={() => setShowSavingsGuide(false)}
      type="savings"
    />

    {confirmAmount && (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={confirmEstimatedAmount}
          className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3"
        >
          <div className="font-bold text-neutral-900 dark:text-neutral-100">Confirmar gasto</div>

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
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm font-semibold rounded-full btn-aura transition"
            >
              Confirmar y marcar pagado
            </button>
            <button
              type="button"
              onClick={() => setConfirmAmount(null)}
              className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )}

    {confirmDelete && (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3">
          <div className="font-bold text-neutral-900 dark:text-neutral-100">¿Eliminar gasto?</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Se borrará <span className="font-semibold">{confirmDelete.name}</span>. Vas a poder
            deshacerlo por unos segundos después de confirmar.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={confirmExpenseDelete}
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

    {confirmDeleteMonth && (
      <div className="modal-overlay fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3">
          <div className="font-bold text-red-600 dark:text-red-400">¿Eliminar mes?</div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Se borrará <span className="font-semibold">{confirmDeleteMonth.label}</span> y TODOS
            sus gastos. Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={confirmMonthDelete}
              className="flex-1 px-3 py-2 text-sm font-semibold bg-red-500 text-white rounded-full hover:bg-red-600 transition"
            >
              Sí, borrar mes
            </button>
            <button
              type="button"
              onClick={() => setConfirmDeleteMonth(null)}
              className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}

    {editingBudgets && (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={saveBudgets}
          className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3"
        >
          <div className="font-bold text-neutral-900 dark:text-neutral-100">Presupuestos del mes</div>
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
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm font-semibold rounded-full btn-aura transition"
            >
              Guardar presupuestos
            </button>
            <button
              type="button"
              onClick={() => setEditingBudgets(false)}
              className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )}

    {editingMonth && (
      <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={saveMonth}
          className="w-full max-w-sm glass-card rounded-3xl p-4 space-y-3"
        >
          <div className="flex justify-between items-center">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Editar mes</div>
            <button
              type="button"
              onClick={() => setConfirmDeleteMonth(editingMonth.month)}
              className="px-2 py-1 text-[11px] font-medium text-red-600 glass rounded-full hover:opacity-80 transition dark:text-red-400"
            >
              🗑 Eliminar mes
            </button>
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
            <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
              Ingreso (ARS)
            </label>
            <MoneyInput
              symbol="$"
              value={editingMonth.income}
              onChange={(v) => setEditingMonth({ ...editingMonth, income: v })}
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 px-3 py-2 text-sm font-semibold rounded-full btn-aura transition"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditingMonth(null)}
              className="px-3 py-2 text-sm font-medium glass rounded-full hover:opacity-80 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}
