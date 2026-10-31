import React from 'react';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  valueDisplay?: string | number;
  helperText?: string;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  valueDisplay,
  helperText,
  disabled,
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-[#0F172A]">
          {label}
        </label>
        <span className="text-xs font-medium text-[#0F766E] bg-[#DDF3EF] px-2 py-0.5 rounded">
          {valueDisplay !== undefined ? valueDisplay : value}
        </span>
      </div>
      <div className="relative py-1 flex items-center">
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F766E] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:ring-offset-1"
          style={{
            background: `linear-gradient(to right, #0F766E 0%, #0F766E ${percentage}%, #E2E8F0 ${percentage}%, #E2E8F0 100%)`,
          }}
          {...props}
        />
      </div>
      {helperText && <p className="text-[11px] text-[#64748B]">{helperText}</p>}
    </div>
  );
};
