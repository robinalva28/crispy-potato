import { describe, it, expect } from 'vitest';
import type { Expense } from '../types.ts';
import { buildClonedExpenses } from './monthUtils.ts';

const prev: Expense[] = [
  {
    id: 1,
    monthId: '2026-06',
    name: 'Alquiler',
    category: 'vivienda',
    amountArs: 688000,
    estimatedArs: null,
    amountUsd: 0,
    usdRate: 0,
    dueDate: null,
    paid: true,
    notes: '',
  },
  {
    id: 2,
    monthId: '2026-06',
    name: 'TC Visa Galicia',
    category: 'tarjetas',
    amountArs: 288263.8,
    estimatedArs: null,
    amountUsd: 10.9,
    usdRate: 1200,
    dueDate: '2026-06-15',
    paid: true,
    notes: 'con USD',
  },
];

describe('buildClonedExpenses', () => {
  const clones = buildClonedExpenses(prev, '2026-08');

  it('crea un gasto por cada item previo', () => {
    expect(clones).toHaveLength(prev.length);
  });

  it('asigna el nuevo monthId', () => {
    expect(clones.every((c) => c.monthId === '2026-08')).toBe(true);
  });

  it('preserva nombre, categoría, montos y cotización USD', () => {
    const visa = clones.find((c) => c.name === 'TC Visa Galicia')!;
    expect(visa.category).toBe('tarjetas');
    expect(visa.amountArs).toBe(288263.8);
    expect(visa.amountUsd).toBe(10.9);
    expect(visa.usdRate).toBe(1200);
    expect(visa.notes).toBe('con USD');
    expect(visa.dueDate).toBe('2026-06-15');
  });

  it('arranca sin pagar (paid: false) en todos los clonados', () => {
    expect(clones.every((c) => c.paid === false)).toBe(true);
  });

  it('no copia el id original', () => {
    expect(clones.every((c) => c.id === undefined)).toBe(true);
  });
});