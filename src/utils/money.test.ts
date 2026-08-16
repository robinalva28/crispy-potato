import { describe, it, expect } from 'vitest';
import { seedDemo } from '../seed.ts';
import {
  getExpenseTotal,
  confirmedTotal,
  projectedTotal,
  remaining,
  categoryTotals,
  paidTotal,
  unpaidTotal,
  filterExpensesByText,
  categoryBudgetStatus,
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

describe('paidTotal / unpaidTotal', () => {
  it('paidTotal suma solo los gastos pagados', () => {
    // Alquiler 500000 + Expensas 80000 + Super 150000 + Luz 25000 + Internet 30000 + Compras 90000
    expect(paidTotal(month.id, expenses)).toBeCloseTo(875000, 2);
  });

  it('unpaidTotal suma solo los pendientes', () => {
    // Nafta 50000 + Cine 20000
    expect(unpaidTotal(month.id, expenses)).toBeCloseTo(70000, 2);
  });
});

describe('filterExpensesByText', () => {
  it('filtra por nombre (case-insensitive)', () => {
    const result = filterExpensesByText(expenses, 'INTERNET');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Internet');
  });

  it('filtra por la etiqueta de categoría', () => {
    const result = filterExpensesByText(expenses, 'vivienda');
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.category === 'vivienda')).toBe(true);
  });

  it('filtra por notas', () => {
    const result = filterExpensesByText(expenses, 'por confirmar');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Nafta');
  });

  it('devuelve todos si la query está vacía', () => {
    expect(filterExpensesByText(expenses, '')).toHaveLength(expenses.length);
    expect(filterExpensesByText(expenses, '   ')).toHaveLength(expenses.length);
  });

  it('devuelve vacío si no hay coincidencias', () => {
    expect(filterExpensesByText(expenses, 'zzz-no-existe')).toHaveLength(0);
  });
});

describe('categoryBudgetStatus', () => {
  it('devuelve null si no hay presupuesto', () => {
    expect(categoryBudgetStatus(50000, undefined)).toBeNull();
    expect(categoryBudgetStatus(50000, 0)).toBeNull();
  });

  it('marca ok por debajo del 80%', () => {
    const res = categoryBudgetStatus(70000, 100000);
    expect(res?.status).toBe('ok');
    expect(res?.pct).toBeCloseTo(0.7, 2);
  });

  it('marca warn entre 80% y 100%', () => {
    expect(categoryBudgetStatus(85000, 100000)?.status).toBe('warn');
  });

  it('marca over por encima del 100%', () => {
    expect(categoryBudgetStatus(150000, 100000)?.status).toBe('over');
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