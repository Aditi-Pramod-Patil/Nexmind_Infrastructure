import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ElementType;
  children?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon: Icon,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap flex-shrink-0 font-semibold rounded-xl transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 border border-transparent',
    secondary: 'bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs focus:ring-2 focus:ring-slate-200',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-2xs focus:ring-2 focus:ring-red-500/20 border border-transparent',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50/80 active:bg-blue-100/80 focus:ring-2 focus:ring-blue-500/20',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-xs sm:text-sm gap-2',
    lg: 'h-10 px-5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-4 h-4',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : Icon ? (
        <Icon className={`${iconSizes[size]} flex-shrink-0`} />
      ) : null}
      {children && <span className="whitespace-nowrap">{children}</span>}
    </button>
  );
}
