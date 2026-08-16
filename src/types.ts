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