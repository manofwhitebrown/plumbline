// Counts what happened in a drop from the engine events (best combo, biggest gem, hits, parts that fired).
// Used for the results summary. Reuses one object per drop.
export function createTally() {
  return { gems: 0, bestCombo: 0, biggest: { tier: 0, value: 0 }, hazardHits: 0, fires: {}, collects: 0 };
}

function num(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export function addEvents(tally, events) {
  if (!tally || !Array.isArray(events)) return tally;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;
    if (e.t === 'COLLECT') {
      tally.collects++;
      tally.bestCombo = Math.max(tally.bestCombo, num(e.combo));
      const item = e.item;
      if (item && (item.kind === 'gem' || item.kind === 'relic')) {
        tally.gems++;
        const v = num(item.value);
        if (num(item.tier) > tally.biggest.tier || (num(item.tier) === tally.biggest.tier && v > tally.biggest.value)) {
          tally.biggest.tier = num(item.tier); tally.biggest.value = v;
        }
      }
    } else if (e.t === 'HAZARD' && !e.absorbedBy) {
      tally.hazardHits++;
    } else if (e.t === 'FIRE' && typeof e.partId === 'string') {
      tally.fires[e.partId] = (tally.fires[e.partId] || 0) + 1;
    }
  }
  return tally;
}

export default { createTally, addEvents };
