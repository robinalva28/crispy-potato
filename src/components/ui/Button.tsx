import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'ghost' | 'danger' | 'violet' | 'dangerGhost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  children: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-aura transition',
  ghost: 'glass rounded-full hover:opacity-80 transition',
  // Destructivo: usa el token dual de acento rojo (neón en dark, profundo en light)
  danger: 'bg-accent-red text-white rounded-full hover:brightness-110 transition',
  violet: 'btn-violet transition',
  dangerGhost: 'text-accent-red glass rounded-full hover:opacity-80 transition',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs font-semibold rounded-full',
  md: 'px-3 py-2.5 text-sm font-medium rounded-full',
  lg: 'px-5 py-2.5 text-sm font-bold rounded-full',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}