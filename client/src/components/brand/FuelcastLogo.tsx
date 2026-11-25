import React from 'react';
import { Flame } from 'lucide-react';

export interface FuelcastLogoProps {
  variant?: 'icon' | 'full' | 'wordmark';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  subtitle?: string;
}

export const FuelcastLogo: React.FC<FuelcastLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  subtitle = 'Gujarat Gas Co. Ltd.',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-8 h-8 rounded-lg',
    lg: 'w-10 h-10 rounded-xl',
  };

  const glyphSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[15px]',
    lg: 'text-lg',
  };

  const subSizes = {
    sm: 'text-[9px]',
    md: 'text-[10px]',
    lg: 'text-xs',
  };

  const renderIcon = () => (
    <div
      className={`${iconSizes[size]} bg-[#004552] border border-[#0A9396]/40 flex items-center justify-center text-[#5EEAD4] shadow-2xs shrink-0 select-none`}
      aria-hidden="true"
    >
      <Flame className={`${glyphSizes[size]} text-[#5EEAD4]`} strokeWidth={2} />
    </div>
  );

  if (variant === 'icon') {
    return renderIcon();
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {renderIcon()}
      <div className="flex flex-col min-w-0">
        <div className="flex items-center tracking-tight leading-none">
          <span className="sr-only">FUELCAST</span>
          <span aria-hidden="true" className={`font-bold text-white ${textSizes[size]}`}>
            FUEL
          </span>
          <span aria-hidden="true" className={`font-bold text-[#5EEAD4] ${textSizes[size]}`}>
            CAST
          </span>
        </div>
        {subtitle && (
          <span className={`${subSizes[size]} text-slate-400 font-semibold tracking-wider uppercase truncate mt-1 leading-none`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
