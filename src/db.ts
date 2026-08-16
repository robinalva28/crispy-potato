import Dexie, { type Table } from 'dexie';
import type { Month, Expense } from './types';

export class BudgetDB extends Dexie {
  months!: Table<Month, string>;
  expenses!: Table<Expense, number>;

  constructor() {
    super('BudgetDB');
    this.version(1).stores({
      months: 'id, label, income, status',
      expenses: '++id, monthId, name, category, amountArs, paid',
    });
  }
}

export const db = new BudgetDB();