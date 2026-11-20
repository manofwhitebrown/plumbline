// Audio lab: listen to every sound and the adaptive music. Uses the real engine on a real AudioContext.
import { createContext } from '../src/audio/synth.js';
import { createEngine } from '../src/audio/engine.js';
import { applyLevels, setLevels, setNight } from '../src/audio/mixer.js';
import { UI_NAMES } from '../src/audio/offline.js';

const $ = (id) => document.getElementById(id);
let engine = null;
let ctx = null;
let musicOn = false;
let busyMs = 0;
let lastWindow = performance.now();

const val = (id) => Number($(id).value);
const collect = (tier) => ({ t: 'COLLECT', lane: Math.floor(Math.random() * 4), item: { kind: 'gem', tier, value: 1 }, gold: 1, combo: val('combo'), r: 0, c: 0 });
const view = () => ({ depth: val('depth'), combo: val('combo'), cols: 4 });

const EVENTS = {
  'Gem tier 1 glass': () => [collect(1)],
  'Gem tier 2 bell': () => [collect(2)],
  'Gem tier 3 warm': () => [collect(3)],
  'Gem tier 4 chime': () => [collect(4)],
  'Gem tier 5 deep': () => [collect(5)],
  'Gem tier 6 shimmer': () => [collect(6)],
  'Gem run (8)': () => Array.from({ length: 8 }, (_, i) => ({ ...collect(1 + (i % 3)), combo: i })),
  'Ore': () => [{ t: 'COLLECT', lane: 1, item: { kind: 'ore', value: 1 }, gold: 1, combo: 0, r: 0, c: 0 }],
  'Relic': () => [{ t: 'COLLECT', lane: 2, item: { kind: 'relic', value: 1 }, gold: 1, combo: 0, r: 0, c: 0 }],
  'Part fire (hook)': () => [{ t: 'FIRE', r: 0, c: 0, partId: 'hook' }],
  'Part fire (magnet)': () => [{ t: 'FIRE', r: 0, c: 1, partId: 'magnet' }],
  'Chain': () => [{ t: 'CHAIN', from: { r: 0, c: 0 }, to: { r: 0, c: 3 } }],
  'Miss': () => [{ t: 'MISS' }],
  'Hazard hit': () => [{ t: 'HAZARD', lane: 1, hazard: 'rock', absorbedBy: null, strainDelta: 3 }],
  'Hazard blocked': () => [{ t: 'HAZARD', lane: 1, hazard: 'rock', absorbedBy: { r: 0, c: 0 }, strainDelta: 0 }],
  'Biome change': () => [{ t: 'BIOME', id: $('biome').value, depth: val('depth') }],
  'Milestone': () => [{ t: 'MILESTONE', depth: 50 }],
  'Record': () => [{ t: 'RECORD', depth: 100 }],
  'HAUL UP': () => [{ t: 'HAUL', gold: 1, depth: val('depth') }],
  'SNAP': () => [{ t: 'SNAP', goldLost: 1, goldKept: 1 }],
};

const VOICES = {
  bell: (V) => V.bell({ freq: 660, vol: 0.2, dur: 1 }),
  glass: (V) => V.glass({ freq: 880, vol: 0.2, dur: 1 }),
  pluck: (V) => V.pluck({ freq: 330, vol: 0.3, dur: 1.5 }),
  pad: (V) => V.pad({ freq: 130, vol: 0.2, dur: 5, attack: 1.5 }),
  sub: (V) => V.sub({ freq: 55, vol: 0.4, dur: 1 }),
  wind: (V) => V.texture({ kind: 'wind', vol: 0.3, dur: 4 }),
  rumble: (V) => V.texture({ kind: 'rumble', vol: 0.3, dur: 4 }),
  dust: (V) => V.dust({ vol: 0.3, dur: 1.5 }),
  creak: (V) => V.creak({ vol: 0.5, dur: 0.8 }),
  coin: (V) => V.coin({ vol: 0.3 }),
  brass: (V) => V.brass({ freq: 262, vol: 0.2, dur: 1 }),
  thud: (V) => V.thud({ vol: 0.6 }),
  boom: (V) => V.boom({ vol: 0.5 }),
  clang: (V) => V.clang({ vol: 0.4 }),
  crack: (V) => V.crack({ vol: 0.5 }),
  whoosh: (V) => V.whoosh({ vol: 0.3, dur: 0.8, attack: 0.4 }),
};

function applyScreen() {
  if (!engine) return;
  const s = $('screen').value;
  engine.music.setScreen(s);
  musicOn = s !== 'results';
  $('music').textContent = 'Music: ' + (musicOn ? 'on' : 'off');
  $('music').classList.toggle('on', musicOn);
}

function pushLevels() {
  setLevels({ sfx: val('vsfx') / 100, music: val('vmusic') / 100 });
  setNight($('night').checked);
  if (engine) applyLevels(engine.synth);
}

function start() {
  if (engine) return;
  ctx = createContext();
  if (!ctx) {
    $('msg').textContent = 'This browser has no WebAudio.';
    return;
  }
  const state = { strain01: 0, combo: 0, depth: 0, biome: $('biome').value };
  engine = createEngine(ctx, { quality: $('quality').value, state });
  pushLevels();
  ctx.resume();
  engine.music.setBiome($('biome').value);
  applyScreen();
  $('start').textContent = 'Audio running';
  $('music').disabled = false;
  setInterval(tick, 100);
  setInterval(meters, 100);
}

function tick() {
  if (!engine || document.hidden) return;
  const t0 = performance.now();
  engine.state.strain01 = val('strain') / 100;
  engine.state.combo = val('combo');
  engine.state.depth = val('depth');
  if (musicOn) engine.tick();
  else engine.heartbeat.update(engine.synth.now(), engine.state.strain01);
  busyMs += performance.now() - t0;
}

// CPU-ish: time spent scheduling per second (the audio thread itself cannot be measured from a page).
function meters() {
  if (!engine) return;
  const S = engine.synth;
  $('voices').textContent = S.voiceCount();
  $('voicesDetail').textContent = `(sfx ${S.sfxVoiceCount()}, music ${S.musicVoiceCount()}, max ${S.limits().maxVoices})`;
  const now = performance.now();
  const pct = Math.min(100, (busyMs / (now - lastWindow)) * 100 * 10);
  $('cpu').style.width = pct + '%';
  $('cpuT').textContent = pct.toFixed(1) + '% (scheduler)';
  busyMs = 0;
  lastWindow = now;
  const an = S.analyser();
  if (an) {
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let pk = 0;
    for (const v of buf) pk = Math.max(pk, Math.abs(v));
    $('lvl').style.width = Math.min(100, pk * 100) + '%';
    $('lvlM').classList.toggle('hot', pk > 0.9);
    $('lvlT').textContent = pk > 0.0001 ? (20 * Math.log10(pk)).toFixed(1) + ' dB' : '-inf';
  }
}

function addButton(parent, label, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => {
    if (!engine) start();
    if (engine) fn();
  };
  $(parent).appendChild(b);
}

for (const [name, make] of Object.entries(EVENTS)) addButton('events', name, () => engine.handle(make(), view()));
for (const name of UI_NAMES) {
  addButton('ui', name, () => engine.ui.play(name, name === 'slider' ? val('combo') / 15 : name === 'charge' ? val('strain') / 100 : name === 'toggle' ? $('night').checked : undefined));
}
for (const [name, fn] of Object.entries(VOICES)) addButton('voicesGrid', name, () => fn(engine.voices));

$('start').onclick = start;
$('music').onclick = () => {
  if (!engine) return;
  musicOn = !musicOn;
  engine.music.setScreen(musicOn ? $('screen').value === 'results' ? 'home' : $('screen').value : 'results');
  $('music').textContent = 'Music: ' + (musicOn ? 'on' : 'off');
  $('music').classList.toggle('on', musicOn);
};
$('screen').onchange = applyScreen;
$('biome').onchange = () => engine && (engine.hooks.biome($('biome').value));
$('quality').onchange = () => engine && engine.synth.setQuality($('quality').value);
$('night').onchange = pushLevels;
$('vsfx').oninput = pushLevels;
$('vmusic').oninput = pushLevels;
for (const [id, fmt] of [['combo', (v) => v], ['strain', (v) => v + '%'], ['depth', (v) => v + ' m']]) {
  const upd = () => ($(id + 'V').textContent = fmt($(id).value));
  $(id).oninput = upd;
  upd();
}
