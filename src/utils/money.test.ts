import { describe, it, expect } from 'vitest';
import { seedDemo } from '../seed.ts';
import {
  getExpenseTotal,
  confirmedTotal,
  projectedTotal,
  remaining,
  categoryTotals,
} from './money.ts';

const { month, expenses } = seedDemo;

describe('getExpenseTotal', () => {
  it('suma ARS + USD * cotización (fórmula V2)', () => {
    const compras = expenses.find((e) => e.name === 'Compras online')!;
    expect(getExpenseTotal(compras)).toBeCloseTo(90000, 2); // 75.000 + 10*1.500
  });

  it('usa estimatedArs cuando amountArs es null', () => {
    const nafta = expenses.find((e) => e.name === 'Nafta')!;
    expect(nafta.amountArs).toBeNull();
    expect(getExpenseTotal(nafta)).toBeCloseTo(50000, 2);
  });

  it('devuelve 0 si no hay montos', () => {
    expect(
      getExpenseTotal({
        id: 999,
        monthId: '2026-07',
        name: 'Vacío',
        category: 'otros',
        amountArs: null,
        estimatedArs: null,
        amountUsd: 0,
        usdRate: 0,
        dueDate: null,
        paid: false,
        notes: '',
      })
    ).toBe(0);
  });
});

describe('totales del mes', () => {
  it('confirmado excluye items por confirmar (amountArs null)', () => {
    const confirmed = confirmedTotal(month.id, expenses);
    // 500000 + 80000 + 150000 + 25000 + 30000 + 20000 + 90000
    expect(confirmed).toBeCloseTo(895000, 2);
  });

  it('proyectado incluye todos los items', () => {
    // 895000 + 50000 (estimado Nafta)
    expect(projectedTotal(month.id, expenses)).toBeCloseTo(945000, 2);
  });

  it('remaining = income - projected', () => {
    expect(remaining(month, expenses)).toBeCloseTo(3055000, 2);
  });
});

describe('categoryTotals', () => {
  it('agrupa por categoría con la fórmula V2', () => {
    const totals = categoryTotals(month.id, expenses);
    expect(totals.get('vivienda')).toBeCloseTo(580000, 2);
    expect(totals.get('servicios')).toBeCloseTo(55000, 2);
    expect(totals.get('tarjetas')).toBeCloseTo(90000, 2);
  });
});