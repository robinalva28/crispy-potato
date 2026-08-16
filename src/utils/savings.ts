import type { ExtraIncome, Month, SavingsGoal, Expense } from '../types.ts';
import { projectedTotal } from './money.ts';

/**
 * Calculadora de ahorro: selectores puros.
 * Un segmento de ahorro ("Auto") proyecta cuánto queda por mes (ingreso − gastos)
 * dentro de un rango, sumando ingresos extra previstos (bonos, aguinaldos...).
 *
 * Regla importante: los meses del rango que YA tienen data usan su propio ahorro.
 * Los meses FUTUROS sin data cargada usan como referencia el ahorro del ÚLTIMO MES CERRADO
 * (el "resto" real más consistente), para que la proyección sea estable.
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

/**
 * Historial de ahorro mes a mes (orden cronológico ascendente).
 * Solo incluye meses que EXISTEN (tienen fila en la tabla months).
 */
export function monthlySavingsHistory(months: Month[], expenses: Expense[]): { monthId: string; savings: number }[] {
  return [...months]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => ({ monthId: m.id, savings: monthlySavings(m, expenses) }));
}

/**
 * Ahorro del ÚLTIMO MES CERRADO (el más reciente por id).
 * Es la "línea base" que se usa para estimar meses futuros sin data.
 * Devuelve null si no hay ningún mes cerrado.
 */
export function lastClosedSavings(months: Month[], expenses: Expense[]): number | null {
  const closed = months
    .filter((m) => m.status === 'cerrado')
    .sort((a, b) => b.id.localeCompare(a.id));
  if (closed.length === 0) return null;
  return monthlySavings(closed[0], expenses);
}

export interface MonthProjection {
  monthId: string;
  savings: number; // ahorro del mes (ingreso − gastos, o referencia si es futuro sin data)
  extras: ExtraIncome[]; // ingresos extra que caen en ese mes
  total: number; // savings + Σ extras
  estimated: boolean; // true si usó la referencia del último mes cerrado
}

export interface SavingsProjection {
  months: MonthProjection[];
  total: number; // Σ de todos los meses del rango
}

/**
 * Proyecta el ahorro de un segmento en el rango [startMonth, endMonth].
 * - Los meses que existen usan su propio ingreso − gastos.
 * - Los meses del rango que NO tienen data cargada usan el ahorro del último mes cerrado
 *   como referencia consistente (estimado). Si no hay ningún mes cerrado, cuentan 0.
 */
export function projectSavings(
  goal: Pick<SavingsGoal, 'startMonth' | 'endMonth' | 'extraIncomes'>,
  months: Month[],
  expenses: Expense[]
): SavingsProjection {
  const ids = monthRange(goal.startMonth, goal.endMonth);
  const monthsById = new Map(months.map((m) => [m.id, m]));
  const baseSavings = lastClosedSavings(months, expenses);

  const extrasByMonth = new Map<string, ExtraIncome[]>();
  for (const extra of goal.extraIncomes) {
    const list = extrasByMonth.get(extra.month) ?? [];
    list.push(extra);
    extrasByMonth.set(extra.month, list);
  }

  const projections: MonthProjection[] = ids.map((monthId) => {
    const month = monthsById.get(monthId);
    let savings: number;
    let estimated = false;
    if (month) {
      savings = monthlySavings(month, expenses);
    } else if (baseSavings != null) {
      savings = baseSavings; // mes futuro sin data → usa el resto del último mes cerrado
      estimated = true;
    } else {
      savings = 0;
    }
    const extras = extrasByMonth.get(monthId) ?? [];
    const extrasTotal = extras.reduce((s, e) => s + e.amount, 0);
    return { monthId, savings, extras, total: savings + extrasTotal, estimated };
  });

  const total = projections.reduce((s, p) => s + p.total, 0);
  return { months: projections, total };
}