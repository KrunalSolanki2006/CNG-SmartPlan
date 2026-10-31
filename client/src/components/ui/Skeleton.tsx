import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card' | 'chart';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  ...props
}) => {
  const baseShimmer =
    'bg-slate-200/80 animate-pulse motion-reduce:animate-none rounded';

  if (variant === 'circular') {
    return <div className={`${baseShimmer} rounded-full ${className}`} {...props} />;
  }

  if (variant === 'text') {
    return <div className={`${baseShimmer} h-3.5 w-3/4 ${className}`} {...props} />;
  }

  if (variant === 'card') {
    return (
      <div
        className={`bg-white rounded-card border border-[#DCE4E8] p-5 shadow-card flex flex-col gap-3 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className={`${baseShimmer} h-4 w-1/3`} />
          <div className={`${baseShimmer} h-4 w-16 rounded-full`} />
        </div>
        <div className={`${baseShimmer} h-8 w-1/2`} />
        <div className={`${baseShimmer} h-3 w-4/5`} />
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div
        className={`bg-white rounded-card border border-[#DCE4E8] p-5 shadow-card flex flex-col gap-4 ${className}`}
        {...props}
      >
        <div className="flex items-center justify-between">
          <div className={`${baseShimmer} h-5 w-40`} />
          <div className={`${baseShimmer} h-6 w-24 rounded`} />
        </div>
        <div className="h-64 w-full flex items-end gap-3 pt-6 px-2">
          {[40, 65, 30, 85, 55, 95, 70, 45, 80, 60].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`flex-1 ${baseShimmer} rounded-t`}
            />
          ))}
        </div>
      </div>
    );
  }

  return <div className={`${baseShimmer} ${className}`} {...props} />;
};
