import type { Month, Expense } from './types.ts';

/**
 * Seed de DEMOSTRACIÓN (público, sin datos personales).
 * Solo se siembra en un dispositivo NUEVO (primera vez) o si nunca se usó.
 * Los dispositivos que ya tienen datos (flag `pe-seeded`) NO vuelven a sembrar.
 */
export const seedDemo: { month: Month; expenses: Expense[] } = {
  month: {
    id: '2026-07',
    label: 'Julio 2026',
    income: 1500000,
    status: 'abierto',
  },
  expenses: [
    { monthId: '2026-07', name: 'Alquiler', category: 'vivienda', amountArs: 500000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: true, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Expensas', category: 'vivienda', amountArs: 80000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: true, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Supermercado', category: 'otros', amountArs: 150000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: true, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Luz', category: 'servicios', amountArs: 25000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: true, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Internet', category: 'servicios', amountArs: 30000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: true, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Nafta', category: 'otros', amountArs: null, estimatedArs: 50000, amountUsd: 0, usdRate: 0, paid: false, dueDate: null, notes: 'Por confirmar' },
    { monthId: '2026-07', name: 'Cine', category: 'eventos', amountArs: 20000, estimatedArs: null, amountUsd: 0, usdRate: 0, paid: false, dueDate: null, notes: '' },
    { monthId: '2026-07', name: 'Compras online', category: 'tarjetas', amountArs: 75000, estimatedArs: null, amountUsd: 10, usdRate: 1500, paid: true, dueDate: null, notes: 'US$10 a $1.500' },
  ],
};