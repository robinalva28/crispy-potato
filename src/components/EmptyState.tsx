import { Button } from './ui/Button.tsx';
import { Icon, type IconName } from './ui/Icon.tsx';

export interface EmptyStateAction {
  key: string;
  label: string;
  icon?: IconName;
  variant?: 'primary' | 'violet' | 'ghost';
  onClick: () => void;
}

interface Props {
  icon: IconName;
  title: string;
  text: string;
  /** Clase token del badge (soft-lime, grad-violet, grad-emerald…). Default soft-lime. */
  badgeClass?: string;
  actions?: EmptyStateAction[];
}

/**
 * Estado vacío reutilizable (mes sin gastos, sin mes creado, etc.).
 * Usa solo variables/tokens del tema — sin hex hardcodeado.
 */
export function EmptyState({ icon, title, text, badgeClass = 'soft-lime', actions }: Props) {
  return (
    <div className="empty-state">
      <div className={`empty-badge ${badgeClass}`}>
        <Icon name={icon} size={26} strokeWidth={2} />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-text">{text}</p>
      {actions && actions.length > 0 && (
        <div className="empty-actions">
          {actions.map((action) => (
            <Button
              key={action.key}
              variant={action.variant ?? 'primary'}
              onClick={action.onClick}
              className="inline-flex items-center justify-center gap-1.5"
            >
              {action.icon && <Icon name={action.icon} size={16} />}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}