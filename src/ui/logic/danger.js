// Strain danger levels for the Drop screen. 0 calm, 1 warm, 2 danger, 3 critical.
export function strainFraction(strain, max) {
  if (!Number.isFinite(strain) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.min(1, Math.max(0, strain / max));
}

export function dangerLevel(strain, max) {
  const f = strainFraction(strain, max);
  if (f >= 0.9) return 3;
  if (f >= 0.75) return 2;
  if (f >= 0.5) return 1;
  return 0;
}

export const GAUGE_TICKS = [0.5, 0.75, 0.9];
