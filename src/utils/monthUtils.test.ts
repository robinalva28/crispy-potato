import { describe, it, expect } from 'vitest';
import type { Expense } from '../types.ts';
import { buildClonedExpenses, shiftDueDateToMonth } from './monthUtils.ts';

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
  });

  it('desplaza la fecha de vencimiento al MISMO día en el mes nuevo', () => {
    const visa = clones.find((c) => c.name === 'TC Visa Galicia')!;
    expect(visa.dueDate).toBe('2026-08-15');
  });

  it('mantiene dueDate null si el original era null', () => {
    const alquiler = clones.find((c) => c.name === 'Alquiler')!;
    expect(alquiler.dueDate).toBeNull();
  });

  it('arranca sin pagar (paid: false) en todos los clonados', () => {
    expect(clones.every((c) => c.paid === false)).toBe(true);
  });

  it('no copia el id original', () => {
    expect(clones.every((c) => c.id === undefined)).toBe(true);
  });
});

describe('shiftDueDateToMonth', () => {
  it('desplaza el mismo día al mes nuevo', () => {
    expect(shiftDueDateToMonth('2026-06-15', '2026-08')).toBe('2026-08-15');
  });

  it('cruza de año correctamente', () => {
    expect(shiftDueDateToMonth('2026-12-20', '2027-01')).toBe('2027-01-20');
  });

  it('clampea el día si no existe en el mes destino (31 → febrero)', () => {
    // Febrero 2026 tiene 28 días
    expect(shiftDueDateToMonth('2026-01-31', '2026-02')).toBe('2026-02-28');
  });

  it('devuelve null si la fecha original es null o inválida', () => {
    expect(shiftDueDateToMonth(null, '2026-08')).toBeNull();
    expect(shiftDueDateToMonth('fecha-invalida', '2026-08')).toBeNull();
    expect(shiftDueDateToMonth('2026-06-15', 'invalido')).toBeNull();
  });
});