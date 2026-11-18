// Daily reward: a 7-day streak. A missed day starts over at day 1.
// Clock safety: the day of the last claim is stored. A clock moved back never pays again.
// A jump forward of 2 or more days counts as a missed day, so it pays day 1 once.
import { DAILY, TWIST_IDS } from '../data/rewards.js';
import { s, changed } from './state.js';
import { now, dayIndex, msToNextDay } from './time.js';
import { money } from './safe.js';
import { addGold, addShards } from './wallet.js';
import { perSecond } from './crew.js';
import { bump } from './stats.js';

export function dailyTwistId() {
  const d = dayIndex(now());
  return TWIST_IDS[((d % TWIST_IDS.length) + TWIST_IDS.length) % TWIST_IDS.length];
}

// Which reward day (1..7) the next claim would be, and whether today can be claimed.
function plan() {
  const st = s();
  const today = dayIndex(now());
  const last = st.daily.lastClaimDay;
  const canClaim = today > last;
  let day = 1;
  if (last >= 0 && today - last === 1) day = (st.daily.streak % 7) + 1;
  else if (last >= 0 && today <= last) day = (st.daily.streak % 7) + 1; // already claimed today: show what comes next
  return { today, last, canClaim, day };
}

export function rewardFor(day) {
  const r = DAILY[Math.min(7, Math.max(1, day)) - 1];
  return { shards: r.shards, gold: money(Math.max(r.goldFloor, perSecond() * 60 * r.goldMinutes)) };
}

export function state() {
  const st = s();
  const p = plan();
  const claimedThrough = p.canClaim ? (p.day === 1 ? 0 : p.day - 1) : st.daily.streak;
  const rewards = DAILY.map((_, i) => {
    const day = i + 1;
    const status = day <= claimedThrough ? 'claimed' : day === p.day && p.canClaim ? 'next' : 'upcoming';
    return { day, status, ...rewardFor(day) };
  });
  return {
    day: p.day, streak: p.canClaim && p.day === 1 ? 0 : st.daily.streak,
    canClaim: p.canClaim, rewards, reward: rewardFor(p.day),
    nextInMs: p.canClaim ? 0 : msToNextDay(now()),
    twist: { id: dailyTwistId(), on: st.daily.twistOn },
  };
}

export function claim() {
  const p = plan();
  if (!p.canClaim) return { ok: false, error: 'Already claimed today' };
  const st = s();
  const reward = rewardFor(p.day);
  st.daily.streak = p.day;
  st.daily.lastClaimDay = p.today;
  addGold(reward.gold);
  addShards(reward.shards);
  bump('dailyClaims', 1);
  changed('daily');
  return { ok: true, day: p.day, ...reward };
}

export function setTwist(on) {
  s().daily.twistOn = !!on;
  changed('daily');
  return s().daily.twistOn;
}

// Cheat helper: let the player claim again today.
export function allowClaimAgain() {
  const st = s();
  st.daily.lastClaimDay = dayIndex(now()) - 1;
  if (st.daily.streak >= 7) st.daily.streak = 0;
  changed('daily');
}
