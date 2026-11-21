// "What to do next": one short plain sentence for Home. It changes as the player grows.
// nextStepLine is pure. readProgress collects the facts and never throws.
export const NEXT_MAX = 60;

// p: { best, partsOwned, canBuyPart, crewOwned, canBuyCrew, collapseReady, canClaimDaily }
export function nextStepLine(p) {
  const x = p && typeof p === 'object' ? p : {};
  const best = Number(x.best) || 0;
  const parts = Number(x.partsOwned) || 0;
  const crew = Number(x.crewOwned) || 0;
  if (best <= 0) return 'Tap Drop to lower your bucket.';
  if (parts <= 1 && x.canBuyPart) return 'Visit the Workshop and buy a new Part.';
  if (parts <= 1) return 'Drop again to earn Gold for a new Part.';
  if (crew <= 0 && x.canBuyCrew) return 'Open Crew and hire one. They earn while you rest.';
  if (x.collapseReady) return 'Collapse is ready. It gives Core Dust for good.';
  if (x.canClaimDaily) return 'Your daily reward is waiting. Tap the gift.';
  if (x.canBuyPart) return 'You can afford a new Part. Visit the Workshop.';
  if (x.canBuyCrew) return 'You can afford more Crew. Open Crew.';
  return 'Go one more meter. Haul Up before the rope Snaps.';
}

const num = (fn, fallback) => { try { const v = fn(); return v === undefined || v === null ? fallback : v; } catch (e) { return fallback; } };

// api: the UI api (api.meta...). best: best depth in metres.
export function readProgress(api, best) {
  const m = api && api.meta ? api.meta : {};
  const owned = num(() => m.ownedParts(), []);
  const ownedIds = Array.isArray(owned) ? owned : Object.keys(owned && typeof owned === 'object' ? owned : {});
  let canBuyPart = false;
  try {
    const all = typeof api.allParts === 'function' ? api.allParts() : [];
    canBuyPart = all.some((d) => { const st = m.partStatus(d.id); return st && st.state === 'buyable'; });
  } catch (e) { canBuyPart = false; }
  const crewList = num(() => m.crew.list(), []);
  const crewArr = Array.isArray(crewList) ? crewList : [];
  return {
    best: Number(best) || 0,
    partsOwned: ownedIds.length,
    canBuyPart,
    crewOwned: crewArr.reduce((n, c) => n + (Number(c && (c.owned != null ? c.owned : c.count)) || 0), 0),
    canBuyCrew: crewArr.some((c) => c && c.canBuy),
    collapseReady: !!num(() => m.collapse.available(), false),
    canClaimDaily: !!num(() => m.daily.state().canClaim, false),
  };
}
