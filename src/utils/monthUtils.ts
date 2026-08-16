import type { Expense } from '../types.ts';

/**
 * Crea los gastos clonados para un nuevo mes a partir de los del mes previo.
 * Los clonados arrancan sin pagar, con el mismo nombre, categoría, montos
 * y cotización USD (regla del template V2).
 */
export function buildClonedExpenses(prevExpenses: Expense[], newMonthId: string): Expense[] {
  return prevExpenses.map((e) => ({
    monthId: newMonthId,
    name: e.name,
    category: e.category,
    amountArs: e.amountArs,
    estimatedArs: e.estimatedArs,
    amountUsd: e.amountUsd,
    usdRate: e.usdRate,
    dueDate: e.dueDate,
    paid: false, // al clonar, los gastos arrancan sin pagar
    notes: e.notes,
  }));
}