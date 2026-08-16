import { describe, it, expect } from 'vitest';
import { seedDemo } from '../seed.ts';
import { monthRange, monthlySavings, projectSavings, type MonthProjection } from './savings.ts';
import type { SavingsGoal } from '../types.ts';

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
    // Seed demo: ingreso 4.000.000, proyectado 945.000
    expect(monthlySavings(month, expenses)).toBeCloseTo(3055000, 2);
  });
});

describe('projectSavings', () => {
  const goal: SavingsGoal = {
    name: 'Auto',
    startMonth: '2026-07',
    endMonth: '2026-07',
    extraIncomes: [{ id: 'bono1', label: 'Bono', amount: 500000, month: '2026-07' }],
  };

  it('suma ahorro del mes + ingresos extra', () => {
    const proj = projectSavings(goal, months, expenses);
    expect(proj.total).toBeCloseTo(3555000, 2); // 3.055.000 + 500.000

    const first: MonthProjection = proj.months[0];
    expect(first.savings).toBeCloseTo(3055000, 2);
    expect(first.extras).toHaveLength(1);
    expect(first.total).toBeCloseTo(3555000, 2);
  });

  it('meses sin data cargada cuentan ahorro 0', () => {
    const wideGoal: SavingsGoal = {
      name: 'Fondo',
      startMonth: '2026-08',
      endMonth: '2026-08',
      extraIncomes: [],
    };
    expect(projectSavings(wideGoal, months, expenses).total).toBe(0);
  });
});