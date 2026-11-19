// Small shared check so encounters can keep away from guardians without importing them (no import loop).
export function guardianBusy(run, metres) {
  const G = run.play && run.play.gd;
  if (!G || !G.on) return false;
  if (G.active) return true;
  return G.mark - run.state.depth <= metres;
}
