import type { Expense } from '../types.ts';
import { getExpenseTotal, fmtARS, fmtUSD, fmtDate, CATEGORY_LABELS } from '../utils/money.ts';
import { Modal } from './ui/Modal.tsx';
import { Button } from './ui/Button.tsx';
import { Icon } from './ui/Icon.tsx';

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 text-[13px]">
      <span className="text-neutral-500 dark:text-neutral-400">{k}</span>
      <span className="font-semibold text-right text-neutral-900 dark:text-neutral-100">{v}</span>
    </div>
  );
}

export function ExpenseDetailModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  if (!expense) return null;
  const isPending = !expense.paid;
  const isEstimated = expense.amountArs == null;
  const hasUsd = expense.amountUsd > 0;
  const total = getExpenseTotal(expense);
  const status = isEstimated ? 'Por confirmar' : isPending ? 'Pendiente' : 'Pagado';
  const ars = isEstimated ? `~${fmtARS(expense.estimatedArs ?? 0)}` : fmtARS(expense.amountArs ?? 0);

  return (
    <Modal open onClose={onClose} title="Detalle del gasto">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-10 h-10 rounded-full flex items-center justify-center ${expense.paid ? 'grad-emerald text-white' : isEstimated ? 'border-2 border-dashed border-accent-violet text-accent-violet' : 'border-2 border-accent-amber text-accent-amber'}`}>
          <Icon name={expense.paid ? 'check' : isEstimated ? 'help' : 'clock'} size={18} strokeWidth={2.5} ariaHidden />
        </span>
        <div>
          <div className="font-bold text-neutral-900 dark:text-neutral-100">{expense.name}</div>
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{CATEGORY_LABELS[expense.category]} · {status}</div>
        </div>
      </div>

      <div className="glass rounded-xl px-3 py-1 mb-3">
        <Row k="Monto ARS" v={ars} />
        <Row k="USD" v={hasUsd ? `${fmtUSD(expense.amountUsd)} a ${fmtARS(expense.usdRate)}` : '—'} />
        <Row k="Total" v={fmtARS(total, 0)} />
        <Row k="Vencimiento" v={fmtDate(expense.dueDate) || '—'} />
        {expense.notes && <Row k="Notas" v={expense.notes} />}
      </div>

      <Button variant="primary" fullWidth onClick={onClose}>
        <Icon name="x" size={16} />Cerrar
      </Button>
    </Modal>
  );
}
