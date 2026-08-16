import type { Category, Expense, Month } from '../types.ts';

/**
 * Total real de un gasto en ARS.
 * Fórmula V2: (amountArs ?? estimatedArs ?? 0) + (amountUsd * usdRate)
 */
export function getExpenseTotal(expense: Expense): number {
  const ars = expense.amountArs ?? expense.estimatedArs ?? 0;
  return ars + expense.amountUsd * expense.usdRate;
}

/** ¿Tiene monto real confirmado? */
function isConfirmed(expense: Expense): boolean {
  return expense.amountArs != null;
}

/**
 * Total confirmado = Σ getExpenseTotal de items donde amountArs != null
 */
export function confirmedTotal(monthId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.monthId === monthId && isConfirmed(e))
    .reduce((sum, e) => sum + getExpenseTotal(e), 0);
}

/**
 * Total proyectado = Σ getExpenseTotal de todos los items
 * (usa estimatedArs si amountArs es null)
 */
export function projectedTotal(monthId: string, expenses: Expense[]): number {
  return expenses
    .filter((e) => e.monthId === monthId)
    .reduce((sum, e) => sum + getExpenseTotal(e), 0);
}

/** Resto / Ahorro proyectado = income − projectedTotal */
export function remaining(month: Month, expenses: Expense[]): number {
  return month.income - projectedTotal(month.id, expenses);
}

// --- Formatters es-AR ---

/** Formatea un número en ARS con formato es-AR (punto de miles, coma decimal). */
export function fmtARS(value: number, decimals = 0): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formatea un número genérico (sin símbolo) con formato es-AR. */
export function fmtNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formatea un porcentaje. */
export function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  vivienda: 'Vivienda',
  servicios: 'Servicios',
  tarjetas: 'Tarjetas',
  eventos: 'Eventos',
  salud: 'Salud',
  impuestos: 'Impuestos',
  otros: 'Otros',
};

export const CATEGORY_ORDER: Category[] = [
  'vivienda', 'tarjetas', 'servicios', 'impuestos', 'salud', 'eventos', 'otros',
];

/** Total gastado por cada categoría en un mes (proyectado, con la fórmula V2). */
export function categoryTotals(monthId: string, expenses: Expense[]): Map<Category, number> {
  const totals = new Map<Category, number>();
  for (const e of expenses) {
    if (e.monthId !== monthId) continue;
    totals.set(e.category, (totals.get(e.category) ?? 0) + getExpenseTotal(e));
  }
  return totals;
}

/** Formatea una fecha ISO (YYYY-MM-DD) a dd/mm. */
export function fmtDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${Number(d)}/${Number(m)}`;
}