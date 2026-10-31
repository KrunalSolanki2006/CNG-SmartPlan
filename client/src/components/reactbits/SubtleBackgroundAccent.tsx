import React from 'react';

/**
 * SubtleBackgroundAccent
 * Adds restrained atmospheric depth to the light canvas without distracting from analytical data.
 */
export const SubtleBackgroundAccent: React.FC = () => {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none opacity-40"
      aria-hidden="true"
    >
      {/* Soft teal glow at top right */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#0F766E]/5 blur-3xl" />
      {/* Soft navy nuance at top left */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-[#142B3A]/3 blur-3xl" />
      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(#142B3A 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};
