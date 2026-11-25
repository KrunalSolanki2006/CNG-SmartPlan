import React from 'react';

/**
 * SubtleBackgroundAccent
 * Adds restrained atmospheric depth to the enterprise slate canvas without distracting from analytical data.
 */
export const SubtleBackgroundAccent: React.FC = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none"
      aria-hidden="true"
    >
      {/* Soft ambient cool wash */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-slate-200/20 via-slate-100/10 to-transparent pointer-events-none" />
      {/* Subtle micro dot matrix pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(#0F172A 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
