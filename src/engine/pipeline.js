// Moves one lane item up one column through the parts, from the bottom row to the top row.
// Each part may collect it, change it, split it, or absorb it.
// Hooks (see docs/notes/AI-2.md): onHazard(ctx, item) -> true when absorbed,
// then onItem(ctx, item) -> item (maybe changed) or null (item is gone).
import { ev } from './events.js';
import { warnOnce } from './safe.js';

function changed(it, k, t, v, h) {
  return it.kind !== k || it.tier !== t || it.value !== v || it.hazard !== h;
}

// Remove a broken part so it cannot break the run again.
function disable(run, idx, e) {
  warnOnce('part:' + run.partIds[idx], 'part ' + run.partIds[idx] + ' failed and was switched off: ' + (e && e.message));
  run.parts[idx] = null;
}

// Send `item` up lane `lane`, starting at row `startRow`.
export function travel(run, lane, item, startRow) {
  const ctx = run.ctx;
  for (let r = startRow; r >= 0; r--) {
    if (item.kind === 'empty') return;
    const idx = r * run.cols + lane;
    const part = run.parts[idx];
    if (!part) continue;
    ctx.enter(r, lane, idx);
    try {
      if (item.kind === 'hazard' && typeof part.onHazard === 'function' && part.onHazard(ctx, item) === true) {
        ctx.touch();
        run.state.stats.hazardsAbsorbed++;
        if (run.out) run.out.push(ev.hazard(lane, item.hazard || 'rock', { r, c: lane }, 0));
        item.kind = 'empty';
        ctx.leave();
        return;
      }
      if (typeof part.onItem === 'function') {
        const k = item.kind, t = item.tier, v = item.value, h = item.hazard;
        const res = part.onItem(ctx, item);
        if (res === null) {                   // the part used the item up
          ctx.touch();
          if (k === 'hazard' && !item.collected) {
            run.state.stats.hazardsAbsorbed++;
            if (run.out) run.out.push(ev.hazard(lane, item.hazard || 'rock', { r, c: lane }, 0));
          }
          item.kind = 'empty';
          ctx.leave();
          return;
        }
        if (res && res !== item && typeof res === 'object') {   // the part gave back a new item
          item.kind = res.kind; item.tier = res.tier; item.value = res.value; item.hazard = res.hazard || '';
        }
        if (changed(item, k, t, v, h)) ctx.touch();
      }
    } catch (e) {
      disable(run, idx, e);
    }
    ctx.leave();
  }
  finish(run, lane, item);
}

// The item reached the top. Missed gems are lost; hazards hit the rope.
function finish(run, lane, item) {
  if (item.collected) return;
  const st = run.state.stats;
  if (item.kind === 'hazard') {
    const delta = item.value > 0 ? item.value : 0;
    run.hazardStrain += delta;
    st.hazardsHit++;
    if (run.out) run.out.push(ev.hazard(lane, item.hazard || 'rock', null, delta));
  } else if (item.kind === 'gem' || item.kind === 'ore' || item.kind === 'relic') {
    st.missed++;
    if (run.out) run.out.push(ev.miss(lane, item));
  }
}
