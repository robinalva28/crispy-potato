import type { ExtraIncome, Month, SavingsGoal, Expense } from '../types.ts';
import { projectedTotal } from './money.ts';

/**
 * Calculadora de ahorro: selectores puros.
 * Un segmento de ahorro ("Auto") proyecta cuánto queda por mes (ingreso − gastos)
 * dentro de un rango, sumando ingresos extra previstos (bonos, aguinaldos...).
 */

/** Genera la lista de ids "YYYY-MM" entre start y end (cruza años: "2026-08" → "2027-02"). */
export function monthRange(start: string, end: string): string[] {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  if (!sy || !sm || !ey || !em || start > end) return [];

  const months: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

/**
 * Ahorro proyectado de un mes = ingreso del mes − gasto proyectado.
 * Puede dar negativo (mes en rojo).
 */
export function monthlySavings(month: Month, expenses: Expense[]): number {
  return month.income - projectedTotal(month.id, expenses);
}

export interface MonthProjection {
  monthId: string;
  savings: number; // ahorro del mes (ingreso − gastos)
  extras: ExtraIncome[]; // ingresos extra que caen en ese mes
  total: number; // savings + Σ extras
}

export interface SavingsProjection {
  months: MonthProjection[];
  total: number; // Σ de todos los meses del rango
}

/**
 * Proyecta el ahorro de un segmento en el rango [startMonth, endMonth].
 * Usa los meses existentes (por id) y su ingreso; los meses sin cargar se ignoran
 * y cuentan ahorro 0 (no hay data).
 */
export function projectSavings(
  goal: Pick<SavingsGoal, 'startMonth' | 'endMonth' | 'extraIncomes'>,
  months: Month[],
  expenses: Expense[]
): SavingsProjection {
  const ids = monthRange(goal.startMonth, goal.endMonth);
  const monthsById = new Map(months.map((m) => [m.id, m]));
  const extrasByMonth = new Map<string, ExtraIncome[]>();
  for (const extra of goal.extraIncomes) {
    const list = extrasByMonth.get(extra.month) ?? [];
    list.push(extra);
    extrasByMonth.set(extra.month, list);
  }

  const projections: MonthProjection[] = ids.map((monthId) => {
    const month = monthsById.get(monthId);
    const savings = month ? monthlySavings(month, expenses) : 0;
    const extras = extrasByMonth.get(monthId) ?? [];
    const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
    return { monthId, savings, extras, total: savings + extrasTotal };
  });

  const total = projections.reduce((s, p) => s + p.total, 0);
  return { months: projections, total };
}