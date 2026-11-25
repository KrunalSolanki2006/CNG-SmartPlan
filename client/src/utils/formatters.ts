/**
 * Standard formatters for FUELCAST
 */

export function formatKgPerDay(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return '—';
  return `${kg.toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg/day`;
}

export function formatMetricTonnes(kg: number | null | undefined): string {
  if (kg === null || kg === undefined || isNaN(kg)) return '—';
  return `${(kg / 1000).toLocaleString('en-IN', { maximumFractionDigits: 2 })} MT/day`;
}

export function formatPercentage(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

export function formatCurrencyINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '—';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
