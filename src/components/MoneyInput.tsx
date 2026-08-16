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
  const baseCls =
    'w-full px-2 py-1.5 text-sm border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100';
  const symbolWidth = symbol === 'u$d' ? 'pl-10' : 'pl-7';

  return (
    <div className="relative">
      <span
        className={`absolute left-2 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none select-none transition-colors ${
          value
            ? 'text-emerald-600 dark:text-emerald-400'
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