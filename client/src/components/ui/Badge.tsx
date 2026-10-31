import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger' | 'synthetic' | 'neutral' | 'teal';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    synthetic: 'bg-[#F2EFFC] text-[#6D5BD0] border-[#D7D0F6]',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium rounded-full border ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
