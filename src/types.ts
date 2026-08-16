export type Category =
  | 'vivienda'
  | 'servicios'
  | 'tarjetas'
  | 'eventos'
  | 'salud'
  | 'impuestos'
  | 'otros';

export interface Month {
  id: string; // "2026-07"
  label: string; // "Julio 2026" (editable por el usuario)
  income: number; // Ingreso principal del mes (ej: 4000000)
  status: 'abierto' | 'cerrado';
  /** Límites de gasto por categoría (opcional). Clave = categoría, valor = monto límite en ARS. */
  categoryBudgets?: Partial<Record<Category, number>>;
  /** Origen del mes: manual o creado/cargado con foto de apuntes. */
  source?: 'manual' | 'photo';
  /** Cuántas veces se reemplazó el mes entero con foto (máximo 1). */
  photoReplacements?: number;
}

export interface Expense {
  id?: number;
  monthId: string;
  name: string;
  category: Category;
  // Montos
  amountArs: number | null; // Monto en pesos (null si está por confirmar)
  estimatedArs: number | null; // Estimación en pesos mientras no se confirma
  // Componente USD (opcional)
  amountUsd: number; // Default 0
  usdRate: number; // Cotización a la que se compraron esos USD (Default 0)
  // Estado
  dueDate: string | null; // ISO date
  paid: boolean;
  notes: string;
}

/** Ingreso extraordinario previsto (ej: bono, aguinaldo, venta). */
export interface ExtraIncome {
  id: string; // id único generado (crypto.randomUUID)
  label: string; // "Bono fin de año"
  amount: number;
  month: string; // "2026-11"
}

/** Segmento de ahorro con nombre y rango de meses (ej: "Auto" de Ago 2026 a Dic 2026). */
export interface SavingsGoal {
  id?: number;
  name: string;
  startMonth: string; // "2026-08"
  endMonth: string; // "2026-12"
  extraIncomes: ExtraIncome[];
}