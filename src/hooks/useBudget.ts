import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../db.ts';
import type { Expense, Month, Category } from '../types.ts';
import { seedDemo } from '../seed.ts';
import { buildClonedExpenses } from '../utils/monthUtils.ts';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const;

/** Convierte "2026-08" en "Agosto 2026". */
export function monthLabelFromId(id: string): string {
  const [y, m] = id.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** Genera el id "YYYY-MM" del mes actual. */
export function currentMonthId(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Siguiente id de mes ("2026-08" → "2026-09", "2026-12" → "2027-01"). */
export function nextMonthId(id: string): string {
  const [y, m] = id.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}

export interface NewMonthInput {
  id: string;
  label: string;
  income: number;
}

const SEEDED_KEY = 'pe-seeded';

export function useBudget() {
  const [months, setMonths] = useState<Month[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeMonthId, setActiveMonthId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastDeleted, setLastDeleted] = useState<Expense | null>(null);
  const lastDeletedRef = useRef<Expense | null>(null);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await refresh();
      setLoading(false);
    })();
  }, []);

  /** Puebla la BD con el seed de demostración SOLO la primera vez (flag en localStorage). */
  const seedIfEmpty = useCallback(async () => {
    if (localStorage.getItem(SEEDED_KEY) === '1') return;
    const monthCount = await db.months.count();
    if (monthCount > 0) {
      localStorage.setItem(SEEDED_KEY, '1');
      return;
    }
    await db.transaction('rw', db.months, db.expenses, async () => {
      await db.months.add(seedDemo.month);
      await db.expenses.bulkAdd(seedDemo.expenses);
    });
    localStorage.setItem(SEEDED_KEY, '1');
  }, []);

  const refresh = useCallback(async () => {
    const [monthRows, expenseRows] = await Promise.all([
      db.months.toArray(),
      db.expenses.toArray(),
    ]);
    setMonths(monthRows);
    setExpenses(expenseRows);
    setActiveMonthId((prev) => {
      if (prev && monthRows.some((m) => m.id === prev)) return prev;
      // Último mes creado (mayor id) por defecto
      const sorted = [...monthRows].sort((a, b) => b.id.localeCompare(a.id));
      return sorted[0]?.id ?? null;
    });
  }, []);

  const activeMonth = months.find((m) => m.id === activeMonthId) ?? null;
  const monthExpenses = activeMonthId
    ? expenses.filter((e) => e.monthId === activeMonthId)
    : [];

  /**
   * Crea un mes nuevo clonando los gastos del último mes existente.
   * Si no hay meses previos, arranca vacío.
   */
  const createMonth = useCallback(async (input: NewMonthInput) => {
    // Último mes por id (orden lexicográfico = cronológico)
    const lastMonth = [...months].sort((a, b) => b.id.localeCompare(a.id))[0] ?? null;

    const newMonth: Month = {
      id: input.id,
      label: input.label || monthLabelFromId(input.id),
      income: input.income,
      status: 'abierto',
    };

    await db.transaction('rw', db.months, db.expenses, async () => {
      await db.months.add(newMonth);
      if (lastMonth) {
        const prevExpenses = await db.expenses.where('monthId').equals(lastMonth.id).toArray();
        const clones = buildClonedExpenses(prevExpenses, newMonth.id);
        if (clones.length > 0) await db.expenses.bulkAdd(clones);
      }
    });

    setActiveMonthId(newMonth.id);
    await refresh();
  }, [months, refresh]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'monthId'>) => {
    if (!activeMonthId) return;
    const id = await db.expenses.add({ ...data, monthId: activeMonthId });
    await refresh();
    return id;
  }, [activeMonthId, refresh]);

  const updateExpense = useCallback(async (id: number, patch: Partial<Expense>) => {
    await db.expenses.update(id, patch);
    await refresh();
  }, [refresh]);

  const deleteExpense = useCallback(async (id: number) => {
    const expense = await db.expenses.get(id);
    if (!expense) return;
    await db.expenses.delete(id);
    // Cancelar restauración previa pendiente
    if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    // Guardar para poder deshacer
    lastDeletedRef.current = expense;
    setLastDeleted(expense);
    pendingTimeout.current = setTimeout(() => {
      lastDeletedRef.current = null;
      setLastDeleted(null);
      pendingTimeout.current = null;
    }, 3000);
    await refresh();
  }, [refresh]);

  /** Restaura el último gasto eliminado (dentro de la ventana de 3s). */
  const restoreLastDeleted = useCallback(async () => {
    const expense = lastDeletedRef.current;
    if (!expense) return;
    if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    pendingTimeout.current = null;
    lastDeletedRef.current = null;
    setLastDeleted(null);
    await db.expenses.add(expense);
    await refresh();
  }, [refresh]);

  const togglePaid = useCallback(async (id: number) => {
    const expense = await db.expenses.get(id);
    if (!expense) return;
    await db.expenses.update(id, { paid: !expense.paid });
    await refresh();
  }, [refresh]);

  const updateMonth = useCallback(async (id: string, patch: Partial<Month>) => {
    await db.months.update(id, patch);
    await refresh();
  }, [refresh]);

  /** Última cotización USD usada en cualquier gasto (para autocompletar). */
  const getLastUsdRate = useCallback(async (): Promise<number | null> => {
    const withRate = await db.expenses
      .where('usdRate')
      .above(0)
      .reverse()
      .sortBy('id');
    return withRate[0]?.usdRate ?? null;
  }, []);

  /** Cierra un mes (histórico inmutable). */
  const closeMonth = useCallback(async (id: string) => {
    await db.months.update(id, { status: 'cerrado' });
    await refresh();
  }, [refresh]);

  /** Reabre un mes cerrado (por si se cerró por error). */
  const reopenMonth = useCallback(async (id: string) => {
    await db.months.update(id, { status: 'abierto' });
    await refresh();
  }, [refresh]);

  /** Elimina un mes y TODOS sus gastos (no se puede deshacer). */
  const deleteMonth = useCallback(async (id: string) => {
    await db.transaction('rw', db.months, db.expenses, async () => {
      await db.months.delete(id);
      await db.expenses.where('monthId').equals(id).delete();
    });
    await refresh();
  }, [refresh]);

  return {
    months,
    expenses,
    activeMonth,
    activeMonthId,
    monthExpenses,
    refresh,
    loading,
    setActiveMonthId,
    createMonth,
    addExpense,
    updateExpense,
    deleteExpense,
    restoreLastDeleted,
    lastDeleted,
    togglePaid,
    updateMonth,
    getLastUsdRate,
    closeMonth,
    reopenMonth,
    deleteMonth,
  };
}

export type { Category };