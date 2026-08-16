import type { Category, Expense } from '../types.ts';
import { ExpenseRow } from './ExpenseRow.tsx';
import { CATEGORY_LABELS } from '../utils/money.ts';
import { fmtARS } from '../utils/money.ts';

interface Props {
  category: Category;
  expenses: Expense[];
  total: number;
  onTogglePaid: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (expense: Expense) => void;
}

export function ExpenseGroup({ category, expenses, total, onTogglePaid, onDelete, onEdit }: Props) {
  return (
    <div>
      <div className="px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800/60 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="text-neutral-700 dark:text-neutral-200">{fmtARS(total, 0)}</span>
      </div>
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          onTogglePaid={onTogglePaid}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
}