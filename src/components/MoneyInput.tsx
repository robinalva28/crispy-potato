interface MoneyInputProps {
  symbol: '$' | 'u$d';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  required?: boolean;
  inputMode?: 'decimal';
}

/** Input de montos con símbolo ( $ o u$d ) integrado a la izquierda. */
export function MoneyInput({
  symbol,
  value,
  onChange,
  placeholder,
  className = '',
  autoFocus,
  required,
  inputMode = 'decimal',
}: MoneyInputProps) {
  const baseCls = 'input-aura w-full px-3 py-2 text-sm';
  const symbolWidth = symbol === 'u$d' ? 'pl-10' : 'pl-7';

  return (
    <div className="relative">
      <span
        className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none select-none transition-colors ${
          value
            ? 'text-accent-emerald'
            : 'text-neutral-400 dark:text-neutral-500'
        }`}
      >
        {symbol}
      </span>
      <input
        type="text"
        inputMode={inputMode}
        autoFocus={autoFocus}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${baseCls} ${symbolWidth} ${className}`}
      />
    </div>
  );
}