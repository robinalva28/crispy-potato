import Dexie, { type Table } from 'dexie';
import type { Month, Expense, SavingsGoal } from './types';

export class BudgetDB extends Dexie {
  months!: Table<Month, string>;
  expenses!: Table<Expense, number>;
  savings!: Table<SavingsGoal, number>;

  constructor() {
    super('BudgetDB');
    this.version(1).stores({
      months: 'id, label, income, status',
      expenses: '++id, monthId, name, category, amountArs, paid',
    });
    this.version(2).stores({
      months: 'id, label, income, status',
      expenses: '++id, monthId, name, category, amountArs, paid',
      savings: '++id, name, startMonth, endMonth',
    });
  }
}

export const db = new BudgetDB();