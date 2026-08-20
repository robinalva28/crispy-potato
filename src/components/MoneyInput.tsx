import { forwardRef, type InputHTMLAttributes, type KeyboardEvent } from 'react';
import { formatInputString } from '../utils/format.ts';

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'inputMode'> {
  symbol: '$' | 'u$d';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  inputMode?: 'decimal';
  /** Modo estimado / por confirmar: acento ámbar en símbolo y borde del input. */
  estimate?: boolean;
}

/** Input de montos con símbolo ( $ o u$d ) integrado a la izquierda.
 *  Extiende el input nativo: acepta `ref`, `onKeyDown`, `onFocus`, etc.
 *  (React 19: el ref viaja como prop normal). */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    symbol,
    value,
    onChange,
    placeholder,
    className = '',
    autoFocus,
    required,
    inputMode = 'decimal',
    estimate = false,
    onKeyDown,
    ...rest
  }: MoneyInputProps,
  ref,
) {
  const baseCls = 'input-aura w-full px-3 py-2 text-sm';
  const symbolWidth = symbol === 'u$d' ? 'pl-10' : 'pl-7';

  return (
    <div className="relative">
      <span
        className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none select-none transition-colors ${
          value
            ? estimate
              ? 'text-accent-amber'
              : 'text-accent-emerald'
            : 'text-neutral-400 dark:text-neutral-500'
        }`}
      >
        {symbol}
      </span>
      <input
        ref={ref}
        type="text"
        inputMode={inputMode}
        autoFocus={autoFocus}
        required={required}
        value={value}
        onChange={(e) => onChange(formatInputString(e.target.value))}
        onKeyDown={onKeyDown as (e: KeyboardEvent<HTMLInputElement>) => void}
        placeholder={placeholder}
        className={`${baseCls} ${estimate ? 'input-aura--estimate' : ''} ${symbolWidth} ${className}`.trim()}
        {...rest}
      />
    </div>
  );
});