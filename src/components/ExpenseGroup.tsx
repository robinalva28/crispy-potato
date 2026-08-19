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
  onDuplicate: (id: number) => void;
  /** Abre el mini menú contextual de una fila (editar/clonar/eliminar). */
  onContextMenu?: (expense: Expense, e: React.MouseEvent<HTMLElement>) => void;
}

export function ExpenseGroup({ category, expenses, total, onTogglePaid, onDelete, onEdit, onDuplicate, onContextMenu }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="px-3 py-1 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide opacity-50">
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="tabular-nums">{fmtARS(total, 0)}</span>
      </div>
      {expenses.map((expense) => (
        <ExpenseRow
          key={expense.id}
          expense={expense}
          onTogglePaid={onTogglePaid}
          onDelete={onDelete}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}