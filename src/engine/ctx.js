// The context object handed to every part hook. One shared object per run (no per-hook allocation).
// Contract fields: run, r, c, lane, rng, emit(event), neighbor(dr, dc).
// Extra helpers for parts (all safe: bad input is ignored):
//   mem                  an object that belongs to this cell and lasts the whole run (counters, charges)
//   beat                 current beat number
//   collect(item, f=1)   pay the item (value x f) with combo and bonuses -> gold paid (0 if not allowed)
//   setTier(item, tier)  change the tier and fix the value to match
//   addStrain(delta)     add (or remove, if negative) strain this beat
//   addSpeed(delta)      change metres per beat from the next beat on
//   addToLane(lane, item, f=0.5)  copy an item into another lane, travelling up from above this part
//   bonusGold(amount)    pay extra gold (shown as a COLLECT)
//   trigger(r, c)        make the part at (r, c) run its onBeat now (chains)
//   run.firedThisBeat, run.lastCollectValue are readable
import { ENGINE } from '../data/engine.js';
import { ev } from './events.js';
import { itemGold, depthBonus } from './gold.js';
import { fin, clamp } from './safe.js';
import { travel } from './pipeline.js';

export class Ctx {
  constructor(run) {
    this.run = run; this.rng = run.rng;
    this.r = 0; this.c = 0; this.lane = 0; this.idx = 0; this.partId = '';
    this.mem = null; this.fired = false; this.acted = false;
  }
  get beat() { return this.run.state.beat; }

  // Point the context at one cell before calling its hook.
  enter(r, c, idx) {
    this.r = r; this.c = c; this.lane = c; this.idx = idx;
    this.partId = this.run.partIds[idx]; this.mem = this.run.mem[idx];
    this.fired = false; this.acted = false;
  }
  leave() { this.acted = false; }

  // This part did something: count it, link it to the part before it, tell the renderer.
  touch() {
    this.acted = true;
    if (this.fired) return;
    this.fired = true;
    const run = this.run, st = run.state.stats;
    run.firedThisBeat++;
    st.fires[this.partId] = (st.fires[this.partId] || 0) + 1;
    if (run.chainR >= 0 && (run.chainR !== this.r || run.chainC !== this.c)) {
      st.chains++;
      if (run.out) run.out.push(ev.chain(run.chainR, run.chainC, this.r, this.c));
    }
    if (run.out) run.out.push(ev.fire(this.r, this.c, this.partId));
    run.chainR = this.r; run.chainC = this.c;
  }

  emit(e) {
    if (!e || typeof e.t !== 'string') return;
    if (e.t === 'COLLECT' && e.item) { this.collect(e.item); return; } // the engine does the money
    if (e.t === 'FIRE') { this.touch(); return; }                      // the engine makes FIRE and CHAIN
    if (e.t === 'CHAIN') return;
    this.touch();
    if (this.run.out) this.run.out.push(e);
  }

  neighbor(dr, dc) {
    const run = this.run, r = this.r + dr, c = this.c + dc;
    if (!(r >= 0 && r < run.rows && c >= 0 && c < run.cols)) return null;
    const id = run.parts[r * run.cols + c] ? run.partIds[r * run.cols + c] : null;
    return id ? { partId: id, r, c } : null;
  }

  collect(item, factor = 1) {
    if (!item || item.collected || (item.kind !== 'gem' && item.kind !== 'ore' && item.kind !== 'relic')) return 0;
    const run = this.run, st = run.state;
    this.touch();
    st.combo++;
    const gold = itemGold(item.value, st.combo, run.goldMult, st.depth, factor);
    st.gold += gold;
    item.collected = true;
    run.collectsThisBeat++;
    run.lastCollectValue = gold;
    const s = st.stats;
    s.collected++;
    if (item.kind === 'gem') s.gems++; else if (item.kind === 'ore') s.ore++; else s.relics++;
    if (st.combo > s.maxCombo) s.maxCombo = st.combo;
    if (run.out) run.out.push(ev.collect(this.lane, item, gold, st.combo, this.r, this.c));
    return gold;
  }

  bonusGold(amount) {
    const run = this.run, st = run.state;
    const a = fin(amount, 0, 'bonus gold');
    if (a <= 0) return 0;
    this.touch();
    const gold = Math.max(1, Math.round(fin(a * run.goldMult * depthBonus(st.depth), 0, 'bonus gold')));
    st.gold += gold;
    run.lastCollectValue = gold;
    if (run.out) run.out.push(ev.collect(this.lane, { kind: 'relic', tier: 1, value: a }, gold, st.combo, this.r, this.c));
    return gold;
  }

  setTier(item, tier) {
    if (!item) return;
    const tv = ENGINE.tierValues;
    const from = clamp(Math.round(fin(item.tier, 1)), 1, 6), to = clamp(Math.round(fin(tier, from)), 1, 6);
    if (from === to) return;
    this.touch();
    item.value = fin(item.value * tv[to - 1] / tv[from - 1], 0, 'item value');
    item.tier = to;
  }

  addStrain(delta) {
    const d = fin(delta, 0, 'strain delta');
    if (d === 0) return;
    this.touch();
    this.run.strainAdjust += d;
  }

  addSpeed(delta) {
    const d = fin(delta, 0, 'speed delta');
    if (d === 0) return;
    this.touch();
    this.run.speedPending += d;
  }

  addToLane(lane, item, factor = 0.5) {
    const run = this.run;
    if (!item || !Number.isInteger(lane) || lane < 0 || lane >= run.cols) return false;
    if (run.extraUsed >= run.extras.length || this.r < 1) return false;
    this.touch();
    const copy = run.extras[run.extraUsed++];
    copy.kind = item.kind; copy.tier = item.tier; copy.hazard = item.hazard || '';
    copy.value = fin(item.value * fin(factor, 0.5), 0, 'item value'); copy.collected = false;
    const save = [this.r, this.c, this.lane, this.idx, this.partId, this.mem, this.fired, this.acted];
    run.chainR = save[0]; run.chainC = save[1];
    travel(run, lane, copy, save[0] - 1);
    [this.r, this.c, this.lane, this.idx, this.partId, this.mem, this.fired, this.acted] = save;
    return true;
  }

  trigger(r, c) {
    const run = this.run;
    if (!Number.isInteger(r) || !Number.isInteger(c) || r < 0 || r >= run.rows || c < 0 || c >= run.cols) return false;
    const idx = r * run.cols + c, part = run.parts[idx];
    if (!part || typeof part.onBeat !== 'function' || run.triggerDepth >= ENGINE.maxTriggerDepth) return false;
    this.touch();
    const save = [this.r, this.c, this.lane, this.idx, this.partId, this.mem, this.fired, this.acted];
    run.chainR = save[0]; run.chainC = save[1];
    run.triggerDepth++;
    this.enter(r, c, idx);
    try { part.onBeat(this); if (this.acted) this.touch(); } catch (e) { run.parts[idx] = null; }
    run.triggerDepth--;
    [this.r, this.c, this.lane, this.idx, this.partId, this.mem, this.fired, this.acted] = save;
    return true;
  }
}
