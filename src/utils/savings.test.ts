import { describe, it, expect } from 'vitest';
import { seedDemo } from '../seed.ts';
import { monthRange, monthlySavings, projectSavings, lastClosedSavings, type MonthProjection } from './savings.ts';
import type { Month, SavingsGoal } from '../types.ts';

const { month, expenses } = seedDemo;
const months = [month];

describe('monthRange', () => {
  it('genera los meses dentro de un rango', () => {
    expect(monthRange('2026-08', '2026-12')).toEqual([
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
    ]);
  });

  it('cruza de año correctamente', () => {
    expect(monthRange('2026-08', '2027-02')).toEqual([
      '2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02',
    ]);
  });

  it('devuelve vacío si start > end', () => {
    expect(monthRange('2026-12', '2026-08')).toEqual([]);
  });
});

describe('monthlySavings', () => {
  it('ahorro = ingreso − gasto proyectado del mes', () => {
    expect(monthlySavings(month, expenses)).toBeCloseTo(3055000, 2);
  });
});

describe('lastClosedSavings', () => {
  it('usa el resto del último mes cerrado como referencia', () => {
    const closed: Month = { ...month, status: 'cerrado' };
    expect(lastClosedSavings([closed], expenses)).toBeCloseTo(3055000, 2);
  });

  it('devuelve null si no hay meses cerrados', () => {
    expect(lastClosedSavings(months, expenses)).toBeNull();
  });
});

describe('projectSavings', () => {
  it('suma ahorro del mes + ingresos extra', () => {
    const goal: SavingsGoal = {
      name: 'Auto',
      startMonth: '2026-07',
      endMonth: '2026-07',
      extraIncomes: [{ id: 'bono1', label: 'Bono', amount: 500000, month: '2026-07' }],
    };
    const proj = projectSavings(goal, months, expenses);
    expect(proj.total).toBeCloseTo(3555000, 2); // 3.055.000 + 500.000

    const first: MonthProjection = proj.months[0];
    expect(first.savings).toBeCloseTo(3055000, 2);
    expect(first.extras).toHaveLength(1);
    expect(first.total).toBeCloseTo(3555000, 2);
  });

  it('meses futuros sin data usan el resto del último mes cerrado como referencia', () => {
    const closedAugust: Month = { id: '2026-08', label: 'Agosto 2026', income: 4200000, status: 'cerrado' };
    const goal: SavingsGoal = {
      name: 'Auto',
      startMonth: '2026-09',
      endMonth: '2026-09',
      extraIncomes: [],
    };
    // El mes 2026-09 no existe → usa el resto del último mes cerrado (Agosto)
    const proj = projectSavings(goal, [closedAugust], []);
    expect(proj.total).toBeCloseTo(4200000, 2);
    expect(proj.months[0].estimated).toBe(true);
  });

  it('sin meses cerrados, meses sin data cuentan 0', () => {
    const goal: SavingsGoal = {
      name: 'Fondo',
      startMonth: '2026-08',
      endMonth: '2026-08',
      extraIncomes: [],
    };
    const proj = projectSavings(goal, months, expenses);
    expect(proj.total).toBe(0);
    expect(proj.months[0].estimated).toBe(false);
  });
});