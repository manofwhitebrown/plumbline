// A safe way to glide a parameter: anchor the start with its current value, then ease to the target.
// Some audio engines (and old browsers) jump if setTargetAtTime has no event before it.
export function target(param, value, t, timeConstant) {
  try {
    param.setValueAtTime(param.value, t);
  } catch (e) {
    // Anchoring is a courtesy.
  }
  param.setTargetAtTime(value, t, timeConstant);
}
