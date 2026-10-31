import React from 'react';
import { Spinner } from './Spinner';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ariaLabel: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      children,
      ariaLabel,
      variant = 'ghost',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'w-7 h-7 p-1 text-xs',
      md: 'w-9 h-9 p-2 text-sm',
      lg: 'w-11 h-11 p-2.5 text-base',
    };

    const variantStyles = {
      primary: 'bg-[#0F766E] text-white hover:bg-[#0D645D] focus-visible:ring-[#0F766E]',
      secondary: 'bg-[#DDF3EF] text-[#0F766E] hover:bg-[#CCEBE6] focus-visible:ring-[#0F766E]',
      outline: 'border border-[#DCE4E8] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-[#F8FAFC] focus-visible:ring-[#0F766E]',
      ghost: 'bg-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 focus-visible:ring-slate-400',
      danger: 'bg-red-50 text-red-600 hover:bg-red-100 focus-visible:ring-red-500',
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-label={ariaLabel}
        title={ariaLabel}
        disabled={disabled || isLoading}
        className={`inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? <Spinner size="sm" className="text-current" /> : children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
