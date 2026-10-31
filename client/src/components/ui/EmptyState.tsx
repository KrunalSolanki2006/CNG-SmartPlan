import React from 'react';
import { Info } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  badge?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  badge,
  className = '',
}) => {
  return (
    <div
      className={`rounded-card border border-dashed border-[#DCE4E8] bg-white p-8 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-[#DDF3EF] text-[#0F766E] flex items-center justify-center mb-3">
        {icon || <Info className="w-6 h-6" />}
      </div>
      {badge && <div className="mb-2">{badge}</div>}
      <h4 className="text-sm font-semibold text-[#0F172A] mb-1">{title}</h4>
      <p className="text-xs text-[#64748B] max-w-md mx-auto mb-4 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
