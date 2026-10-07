'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const baseStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.375rem',
  fontWeight: 500,
  borderRadius: '0.5rem',
  border: '1px solid transparent',
  transition: 'opacity 0.15s ease, background-color 0.15s ease',
  cursor: 'pointer',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, rgb(var(--brand-600)), rgb(var(--brand-500)))',
    color: '#fff',
    boxShadow: '0 1px 4px rgb(var(--brand-600) / 0.3)',
  },
  secondary: {
    backgroundColor: 'rgb(var(--surface-raised))',
    color: 'rgb(var(--foreground))',
    border: '1px solid rgb(var(--border))',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'rgb(var(--muted))',
  },
  danger: {
    backgroundColor: 'rgb(var(--loss-bg))',
    color: 'rgb(var(--loss))',
    border: '1px solid rgb(var(--loss) / 0.3)',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'rgb(var(--brand-500))',
    border: '1px solid rgb(var(--brand-500))',
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-2.5 py-1.5 h-7',
  md: 'text-sm px-4 py-2 h-9',
  lg: 'text-sm px-5 py-2.5 h-11',
  icon: 'p-1.5 w-8 h-8',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth,
  disabled,
  className,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(sizeStyles[size], fullWidth && 'w-full', className)}
      style={{
        ...baseStyle,
        ...variantStyles[variant],
        opacity: disabled || loading ? 0.6 : 1,
        ...style,
      }}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
