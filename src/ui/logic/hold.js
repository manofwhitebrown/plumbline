// Press-and-hold math. Progress goes 0..1 over `total` ms and stops at 1.
export function holdProgress(elapsedMs, totalMs) {
  const t = Number.isFinite(totalMs) && totalMs > 0 ? totalMs : 1000;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
  return Math.min(1, elapsedMs / t);
}
