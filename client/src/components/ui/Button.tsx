import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-5 py-2.5 gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-[#0F766E] text-white hover:bg-[#0D645D] active:bg-[#0A4E48] focus-visible:ring-[#0F766E] shadow-sm',
      secondary:
        'bg-[#DDF3EF] text-[#0F766E] hover:bg-[#CCEBE6] active:bg-[#BBE3DC] focus-visible:ring-[#0F766E]',
      outline:
        'border border-[#DCE4E8] bg-white text-[#0F172A] hover:bg-[#F8FAFC] active:bg-[#F1F5F9] focus-visible:ring-[#0F766E] shadow-sm',
      danger:
        'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B] focus-visible:ring-[#DC2626] shadow-sm',
      ghost:
        'bg-transparent text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Spinner size={size === 'sm' ? 'sm' : 'md'} className="text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
