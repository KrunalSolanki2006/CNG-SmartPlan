import React from 'react';
import { DataOrigin } from '../../types/api';
import { getDataOriginConfig } from '../../utils/dataOrigin';

export interface DataOriginBadgeProps {
  origin: DataOrigin;
  size?: 'sm' | 'md';
  showTooltip?: boolean;
  className?: string;
}

export const DataOriginBadge: React.FC<DataOriginBadgeProps> = ({
  origin,
  size = 'md',
  showTooltip = true,
  className = '',
}) => {
  const config = getDataOriginConfig(origin);

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 tracking-tight',
    md: 'text-xs px-2.5 py-1 tracking-tight',
  };

  return (
    <span
      role="status"
      title={showTooltip ? config.description : undefined}
      aria-label={`${config.label}: ${config.description}`}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-2xs select-none transition-colors ${sizeClasses[size]} ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
