import type { Expense, Month } from '../types.ts';

/**
 * Desplaza una fecha ISO "YYYY-MM-DD" al mismo día en un mes nuevo.
 * Si el día no existe en el mes destino (ej: 31 en febrero), usa el último día del mes.
 * Devuelve null si la fecha original no es válida.
 */
export function shiftDueDateToMonth(dueDate: string | null, newMonthId: string): string | null {
  if (!dueDate) return null;
  const [y, m, d] = dueDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const [ny, nm] = newMonthId.split('-').map(Number);
  if (!ny || !nm) return null;

  // Último día del mes destino (ej: febrero 2026 → 28/29)
  const lastDay = new Date(ny, nm, 0).getDate();
  const clampedDay = Math.min(d, lastDay);
  return `${ny}-${String(nm).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/** ¿Se permite cargar/reemplazar un mes con foto de apuntes? (máximo 1 reemplazo) */
export function canUsePhoto(month: Month | null): boolean {
  if (!month) return false;
  return (month.photoReplacements ?? 0) < 1;
}

/**
 * Crea los gastos clonados para un nuevo mes a partir de los del mes previo.
 * Los clonados arrancan sin pagar, con el mismo nombre, categoría, montos
 * y cotización USD (regla del template V2).
 *
 * IMPORTANTE: la fecha de vencimiento (dueDate) se DESPLAZA al mismo día en el
 * mes nuevo (ej: clonar agosto → septiembre, "2026-08-10" → "2026-09-10").
 * Si el día no existe en el mes destino, se usa el último día de ese mes.
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
    dueDate: shiftDueDateToMonth(e.dueDate, newMonthId),
    paid: false, // al clonar, los gastos arrancan sin pagar
    notes: e.notes,
  }));
}
