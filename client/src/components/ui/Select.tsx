import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label?: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      id,
      label,
      options,
      helperText,
      error,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const describedBy = errorId || helperId;

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className="text-xs font-semibold text-[#0F172A]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-white px-3.5 py-2 text-sm text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed ${
            error
              ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
              : 'border-[#DCE4E8] hover:border-slate-300'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-red-600 font-medium" role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-[#64748B]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
