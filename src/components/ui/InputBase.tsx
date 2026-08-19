import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';

interface FieldWrapProps {
  label?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Label + contenedor estándar para campos de formulario. */
export function Field({ label, hint, children, className = '' }: FieldWrapProps) {
  return (
    <div className={className}>
      {label != null && (
        <label className="block text-[11px] text-neutral-500 font-medium mb-1 dark:text-neutral-400">
          {label}
        </label>
      )}
      {children}
      {hint != null && <div className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{hint}</div>}
    </div>
  );
}

interface InputBaseProps extends InputHTMLAttributes<HTMLInputElement> {
  /* mismo API que input nativo + className extra */
}

/** Input base con la estética input-aura (misma en toda la app). */
export function InputBase({ className = '', ...rest }: InputBaseProps) {
  return <input className={`input-aura w-full px-3 py-2 text-sm ${className}`.trim()} {...rest} />;
}

interface SelectBaseProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /* mismo API que select nativo */
}

/** Select base con la estética input-aura. */
export function SelectBase({ className = '', children, ...rest }: SelectBaseProps) {
  return (
    <select className={`input-aura w-full px-3 py-2 text-sm ${className}`.trim()} {...rest}>
      {children}
    </select>
  );
}