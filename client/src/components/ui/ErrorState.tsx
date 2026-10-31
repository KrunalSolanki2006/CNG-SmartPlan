import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  code?: string;
  message: string;
  fields?: Record<string, string[]> | null;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Request Failed',
  code,
  message,
  fields,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`rounded-card border border-red-200 bg-red-50/70 p-6 flex flex-col items-center text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <h4 className="text-sm font-semibold text-red-900">{title}</h4>
        {code && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-200/70 text-red-800 font-medium">
            {code}
          </span>
        )}
      </div>
      <p className="text-xs text-red-700 max-w-md mx-auto mb-3 leading-relaxed">{message}</p>

      {fields && Object.keys(fields).length > 0 && (
        <div className="text-left w-full max-w-sm mb-4 bg-white/80 rounded p-2.5 border border-red-100 text-xs">
          <p className="font-semibold text-red-800 mb-1">Validation details:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-red-700 text-[11px]">
            {Object.entries(fields).map(([field, msgs]) => (
              <li key={field}>
                <span className="font-mono font-medium">{field}</span>: {msgs.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          className="border-red-300 text-red-800 hover:bg-red-100"
        >
          Retry Request
        </Button>
      )}
    </div>
  );
};
