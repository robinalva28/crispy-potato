import { useEffect, useRef, useState } from 'react';
import { db } from './db.ts';
import type { Expense, Month } from './types.ts';
import { useBudget, monthLabelFromId } from './hooks/useBudget.ts';
import { useDarkMode } from './hooks/useDarkMode.ts';
import { MonthSelector } from './components/MonthSelector.tsx';
import { MonthHeader } from './components/MonthHeader.tsx';
import { ExpenseRow } from './components/ExpenseRow.tsx';
import { ExpenseGroup } from './components/ExpenseGroup.tsx';
import { CategoryBars } from './components/CategoryBars.tsx';
import { ExpenseForm } from './components/ExpenseForm.tsx';
import { categoryTotals, CATEGORY_ORDER } from './utils/money.ts';

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
  const { dark, toggle } = useDarkMode();
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editingMonth, setEditingMonth] = useState<EditingMonthState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  const expenseFormRef = useRef<HTMLDivElement | null>(null);

  const { activeMonth } = budget;

  // Al abrir el formulario de gasto (agregar/editar), scrollea hasta él
  useEffect(() => {
    if (editing) {
      expenseFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editing]);

  // --- Export / Import ---
  async function exportJSON() {
    if (!activeMonth) return;
    const expenses = await db.expenses.where('monthId').equals(activeMonth.id).toArray();
    const months = await db.months.toArray();
    const jsonContent = JSON.stringify({ months, expenses }, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto-${activeMonth.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      await db.transaction('rw', db.months, db.expenses, async () => {
        if (Array.isArray(data.months)) await db.months.bulkPut(data.months);
        if (Array.isArray(data.expenses)) await db.expenses.bulkPut(data.expenses);
      });
      // Refrescar estado sin recargar la página
      await budget.refresh();
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
  }

  // --- CRUD gastos ---
  async function saveExpense(data: Omit<Expense, 'id' | 'monthId'>) {
    if (editing?.expense) {
      await budget.updateExpense(editing.expense.id!, data);
    } else {
      await budget.addExpense(data);
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
    // El toast "Deshacer" de 3s sigue como segunda capa de seguridad
  }

  if (budget.loading) {
    return (
      <div className="max-w-md mx-auto my-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Cargando…
      </div>
    );
  }

  if (!activeMonth) {
    return (
      <main className="max-w-md mx-auto my-4 bg-white rounded-xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:shadow-none dark:border dark:border-neutral-800">
        <MonthSelector
          months={budget.months}
          activeMonthId={budget.activeMonthId}
          onSelect={budget.setActiveMonthId}
          onCreate={budget.createMonth}
        />
        <div className="p-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
          No hay meses. Creá el primero con "+ Crear Mes".
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto my-4 bg-white rounded-xl shadow-sm overflow-hidden dark:bg-neutral-900 dark:shadow-none dark:border dark:border-neutral-800">
      <MonthSelector
        months={budget.months}
        activeMonthId={budget.activeMonthId}
        onSelect={budget.setActiveMonthId}
        onCreate={budget.createMonth}
      />

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
        {!groupByCategory &&
          budget.monthExpenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              onTogglePaid={activeMonth.status === 'abierto' ? budget.togglePaid : () => {}}
              onDelete={activeMonth.status === 'abierto' ? requestDelete : () => {}}
              onEdit={(exp) => {
                if (activeMonth.status === 'abierto') setEditing({ expense: exp, adding: false });
              }}
            />
          ))}
        {groupByCategory && (
          <>
            {activeMonth.status === 'abierto' && (
              <div className="border-b border-neutral-200 dark:border-neutral-800">
                <CategoryBars totals={categoryTotals(activeMonth.id, budget.monthExpenses)} />
              </div>
            )}
            {CATEGORY_ORDER.map((cat) => {
              const catExpenses = budget.monthExpenses.filter((e) => e.category === cat);
              if (catExpenses.length === 0) return null;
              const totals = categoryTotals(activeMonth.id, budget.monthExpenses);
              return (
                <div key={cat} className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  <ExpenseGroup
                    category={cat}
                    expenses={catExpenses}
                    total={totals.get(cat) ?? 0}
                    onTogglePaid={activeMonth.status === 'abierto' ? budget.togglePaid : () => {}}
                    onDelete={activeMonth.status === 'abierto' ? requestDelete : () => {}}
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

      {budget.lastDeleted && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm px-4 py-3 bg-neutral-900 text-white rounded-xl shadow-lg flex items-center justify-between gap-3 dark:bg-neutral-100 dark:text-neutral-900">
          <span className="text-sm">Gasto eliminado</span>
          <button
            type="button"
            onClick={budget.restoreLastDeleted}
            className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 dark:text-emerald-600 dark:hover:text-emerald-500"
          >
            Deshacer
          </button>
        </div>
      )}

      <footer className="px-4 py-3 bg-neutral-50 border-t border-neutral-200 dark:bg-neutral-900/60 dark:border-neutral-800">
        {activeMonth.status === 'abierto' && (
          <>
            <button
              type="button"
              onClick={() => setGroupByCategory(!groupByCategory)}
              className="w-full mb-2 px-3 py-2 text-sm font-medium text-neutral-600 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {groupByCategory ? '☰ Ver lista completa' : '🗂 Agrupar por categoría'}
            </button>
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
            onClick={() => budget.reopenMonth(activeMonth.id)}
            className="w-full px-3 py-2 text-sm font-medium text-amber-600 border border-amber-300 rounded-md hover:bg-amber-50 transition dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-950/20"
          >
            🔓 Reabrir mes
          </button>
        )}
        {activeMonth.status === 'abierto' && (
          <button
            type="button"
            onClick={() => budget.closeMonth(activeMonth.id)}
            className="w-full mt-2 px-3 py-2 text-sm font-medium text-neutral-500 border border-neutral-300 rounded-md hover:bg-neutral-100 transition dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            🔒 Cerrar mes
          </button>
        )}

        <div className="mt-3 flex items-center justify-center gap-2">
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