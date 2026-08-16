import { useCallback, useEffect, useState } from 'react';
import { db } from '../db.ts';
import type { ExtraIncome, SavingsGoal } from '../types.ts';

/** CRUD de segmentos de ahorro (SavingsGoal) con ingresos extra. */
export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      await refresh();
      setLoading(false);
    })();
  }, []);

  const refresh = useCallback(async () => {
    const rows = await db.savings.toArray();
    setGoals(rows);
  }, []);

  const addGoal = useCallback(async (data: Omit<SavingsGoal, 'id'>) => {
    const id = await db.savings.add(data);
    await refresh();
    return id;
  }, [refresh]);

  const updateGoal = useCallback(async (id: number, patch: Partial<SavingsGoal>) => {
    await db.savings.update(id, patch);
    await refresh();
  }, [refresh]);

  const deleteGoal = useCallback(async (id: number) => {
    await db.savings.delete(id);
    await refresh();
  }, [refresh]);

  /** Agrega un ingreso extra a un segmento. */
  const addExtraIncome = useCallback(async (goalId: number, extra: ExtraIncome) => {
    const goal = await db.savings.get(goalId);
    if (!goal) return;
    const extraIncomes = [...goal.extraIncomes, extra];
    await db.savings.update(goalId, { extraIncomes });
    await refresh();
  }, [refresh]);

  /** Quita un ingreso extra de un segmento. */
  const removeExtraIncome = useCallback(async (goalId: number, extraId: string) => {
    const goal = await db.savings.get(goalId);
    if (!goal) return;
    const extraIncomes = goal.extraIncomes.filter((e) => e.id !== extraId);
    await db.savings.update(goalId, { extraIncomes });
    await refresh();
  }, [refresh]);

  return {
    goals,
    loading,
    refresh,
    addGoal,
    updateGoal,
    deleteGoal,
    addExtraIncome,
    removeExtraIncome,
  };
}