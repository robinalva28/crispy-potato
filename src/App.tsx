import { useEffect, useRef, useState } from 'react';
import { db } from './db.ts';
import type { Category, Expense, Month, SavingsGoal } from './types.ts';
import { useBudget, monthLabelFromId } from './hooks/useBudget.ts';
import { useSavings } from './hooks/useSavings.ts';
import { useDarkMode } from './hooks/useDarkMode.ts';
import { MonthSelector } from './components/MonthSelector.tsx';
import { MonthHeader } from './components/MonthHeader.tsx';
import { ExpenseRow } from './components/ExpenseRow.tsx';
import { ExpenseGroup } from './components/ExpenseGroup.tsx';
import { CategoryBars } from './components/CategoryBars.tsx';
import { ExpenseForm } from './components/ExpenseForm.tsx';
import { GuideModal } from './components/GuideModal.tsx';
import { SavingsCalculator } from './components/SavingsCalculator.tsx';
import { SavingsGoalForm } from './components/SavingsGoalForm.tsx';
import { parseLocalNumber } from './utils/format.ts';
import {
  categoryTotals,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  getExpenseTotal,
  fmtARS,
  filterExpensesByText,
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

type View = 'budget' | 'savings';

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
  const expenseFormRef = useRef<HTMLDivElement | null>(null);

  const { activeMonth } = budget;
  const filteredExpenses = filterExpensesByText(budget.monthExpenses, searchQuery);
  const monthBudgets = activeMonth?.categoryBudgets ?? {};

  // Guía de uso: aparece automáticamente la primera vez que se abre la app
  useEffect(() => {
    if (localStorage.getItem('pe-guided') !== '1') {
      setShowGuide(true);
      localStorage.setItem('pe-guided', '1');
    }
  }, []);

  // Guía de ahorro: aparece la primera vez que se entra a la pestaña 💰
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
    const income = Number(editingMonth.income);
    if (isNaN(income) || income < 0) return;
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
        expense.estimatedArs != null ? String(expense.estimatedArs) : ''
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
      inputs[cat] = val != null ? String(val) : '';
    }
    setBudgetInputs(inputs);
    setEditingBudgets(true);
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
    <main className="max-w-md mx-auto my-4 bg-white rounded-xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:shadow-none dark:border dark:border-neutral-800">
      {/* Tabs: Presupuesto | Ahorro */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          type="button"
          onClick={() => setView('budget')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
            view === 'budget'
              ? 'bg-white text-emerald-700 border-b-2 border-emerald-500 dark:bg-neutral-900 dark:text-emerald-400'
              : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-900/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          📋 Presupuesto
        </button>
        <button
          type="button"
          onClick={() => setView('savings')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition ${
            view === 'savings'
              ? 'bg-white text-emerald-700 border-b-2 border-emerald-500 dark:bg-neutral-900 dark:text-emerald-400'
              : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 dark:bg-neutral-900/60 dark:text-neutral-400 dark:hover:bg-neutral-800'
          }`}
        >
          💰 Ahorro
        </button>
      </div>

      {view === 'budget' && (
        <>
          <MonthSelector
            months={budget.months}
            activeMonthId={budget.activeMonthId}
            onSelect={budget.setActiveMonthId}
            onCreate={async (input) => {
              await budget.createMonth(input);
              fdb.success();
            }}
          />

          {activeMonth && (
            <>
              <MonthHeader
                month={activeMonth}
                expenses={budget.monthExpenses}
                onEditMonth={() => {
                  if (activeMonth.status === 'abierto') {
                    setEditingMonth({
                      month: activeMonth,
                      label: activeMonth.label,
                      income: String(activeMonth.income),
                    });
                  }
                }}
                dark={dark}
                onToggleDark={toggle}
                isClosed={activeMonth.status === 'cerrado'}
              />

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

              <section className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {budget.monthExpenses.length === 0 && (
                  <div className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Sin gastos todavía. Toque "+ Agregar Gasto".
                  </div>
                )}
                {budget.monthExpenses.length > 0 && (
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="🔍 Buscar gasto…"
                      className="w-full px-3 py-1.5 text-sm bg-neutral-50 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
                    />
                  </div>
                )}
                {searchQuery.trim() !== '' && filteredExpenses.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Sin resultados para "{searchQuery.trim()}"
                  </div>
                )}
                {!groupByCategory &&
                  filteredExpenses.map((expense) => (
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
                {groupByCategory && (
                  <>
                    {activeMonth.status === 'abierto' && (
                      <div className="border-b border-neutral-200 dark:border-neutral-800">
                        <CategoryBars totals={categoryTotals(activeMonth.id, budget.monthExpenses)} budgets={monthBudgets} />
                      </div>
                    )}
                    {CATEGORY_ORDER.map((cat) => {
                      const catExpenses = filteredExpenses.filter((e) => e.category === cat);
                      if (catExpenses.length === 0) return null;
                      const totals = categoryTotals(activeMonth.id, filteredExpenses);
                      return (
                        <div key={cat} className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          <ExpenseGroup
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
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            </>
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

          {activeMonth && (
            <footer className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800">
              {activeMonth.status === 'abierto' && (
                <>
                  <div className="w-full mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setGroupByCategory(!groupByCategory)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      {groupByCategory ? '☰ Ver lista completa' : '🗂 Agrupar por categoría'}
                    </button>
                    <button
                      type="button"
                      onClick={openBudgetEditor}
                      className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
                    >
                      ⚙ Presupuestos
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing({ expense: null, adding: true })}
                    className="w-full px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
                  >
                    + Agregar Gasto
                  </button>
                </>
              )}
              {activeMonth.status === 'cerrado' && (
                <button
                  type="button"
                  onClick={() => {
                    void budget.reopenMonth(activeMonth.id);
                    fdb.reopenMonth();
                  }}
                  className="w-full px-3 py-2 text-sm font-medium text-amber-600 border border-amber-300 rounded-md hover:bg-amber-50 transition dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-950/20"
                >
                  🔓 Reabrir mes
                </button>
              )}
              {activeMonth.status === 'abierto' && (
                <button
                  type="button"
                  onClick={() => {
                    void budget.closeMonth(activeMonth.id);
                    fdb.closeMonth();
                  }}
                  className="w-full mt-2 px-3 py-2 text-sm font-medium text-neutral-500 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  🔒 Cerrar mes
                </button>
              )}

              <div className="mt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  aria-label="Guía de uso"
                  title="Guía de uso"
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  ❓ Guía
                </button>
                <button
                  type="button"
                  onClick={toggleSound}
                  aria-label={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
                  title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonidos'}
                  className={`px-3 py-1.5 text-xs font-medium border rounded-md transition ${
                    soundEnabled
                      ? 'text-neutral-600 border-neutral-300 hover:bg-neutral-100 dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800'
                      : 'text-neutral-300 border-neutral-200 hover:bg-neutral-100 dark:text-neutral-600 dark:border-neutral-800 dark:hover:bg-neutral-800'
                  }`}
                >
                  {soundEnabled ? '🔊 Sonidos' : '🔇 Sonidos'}
                </button>
                <button
                  type="button"
                  onClick={exportJSON}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Exportar JSON
                </button>
                <label className="px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition cursor-pointer dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800">
                  Importar JSON
                  <input type="file" accept="application/json" className="hidden" onChange={importJSON} />
                </label>
              </div>
            </footer>
          )}
        </>
      )}

      {view === 'savings' && (
        <>
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
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => setShowSavingsGuide(true)}
              aria-label="Guía de ahorro"
              title="Guía de ahorro"
              className="w-full px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              ❓ Guía de ahorro
            </button>
          </div>
        </>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={confirmEstimatedAmount}
            className="w-full max-w-sm bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800"
          >
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Confirmar gasto</div>

            {/* Contexto completo del gasto por confirmar */}
            <div className="bg-neutral-50 rounded-lg p-3 space-y-1 text-xs dark:bg-neutral-800/60">
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
                    US${confirmAmount.amountUsd} a {fmtARS(confirmAmount.usdRate)}
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
              <input
                autoFocus
                inputMode="decimal"
                value={confirmAmountValue}
                onChange={(e) => setConfirmAmountValue(e.target.value)}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
              >
                Confirmar y marcar pagado
              </button>
              <button
                type="button"
                onClick={() => setConfirmAmount(null)}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <div className="font-bold text-neutral-900 dark:text-neutral-100">¿Eliminar gasto?</div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Se borrará <span className="font-semibold">{confirmDelete.name}</span>. Vas a poder
              deshacerlo por unos segundos después de confirmar.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={confirmExpenseDelete}
                className="flex-1 px-3 py-2 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition"
              >
                Sí, borrar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBudgets && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveBudgets}
            className="w-full max-w-sm bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800"
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
                <input
                  inputMode="decimal"
                  value={budgetInputs[cat] ?? ''}
                  onChange={(e) => setBudgetInputs({ ...budgetInputs, [cat]: e.target.value })}
                  placeholder="Sin límite"
                  className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
                />
              </div>
            ))}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                className="flex-1 px-3 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
              >
                Guardar presupuestos
              </button>
              <button
                type="button"
                onClick={() => setEditingBudgets(false)}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {editingMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={saveMonth}
            className="w-full max-w-sm bg-white rounded-xl shadow-xl p-4 space-y-3 dark:bg-neutral-900 dark:border dark:border-neutral-800"
          >
            <div className="font-bold text-neutral-900 dark:text-neutral-100">Editar mes</div>
            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1">Etiqueta</label>
              <input
                value={editingMonth.label}
                onChange={(e) => setEditingMonth({ ...editingMonth, label: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
                Ingreso (ARS)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={editingMonth.income}
                onChange={(e) => setEditingMonth({ ...editingMonth, income: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100"
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
                onClick={() => setEditingMonth(null)}
                className="px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}