// A fake AudioContext for tests. It is strict, like a real browser:
// it throws on non-finite numbers and on exponential ramps to zero or below.

function finite(name, v) {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${name} must be a finite number, got ${v}`);
}

class FakeParam {
  constructor(owner, value) {
    this.owner = owner;
    this._value = value;
    this.calls = [];
  }
  get value() {
    return this._value;
  }
  set value(v) {
    finite('value', v);
    this._value = v;
  }
  setValueAtTime(v, t) {
    finite('value', v);
    finite('time', t);
    this.calls.push(['set', v, t]);
    return this;
  }
  linearRampToValueAtTime(v, t) {
    finite('value', v);
    finite('time', t);
    this.calls.push(['lin', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v, t) {
    finite('value', v);
    finite('time', t);
    if (v <= 0) throw new Error('exponential ramp target must be above zero');
    this.calls.push(['exp', v, t]);
    return this;
  }
  setTargetAtTime(v, t, c) {
    finite('value', v);
    finite('time', t);
    finite('constant', c);
    if (c <= 0) throw new Error('time constant must be above zero');
    this.calls.push(['target', v, t]);
    return this;
  }
  cancelScheduledValues(t) {
    finite('time', t);
    return this;
  }
}

class FakeNode {
  constructor(ctx, kind) {
    this.ctx = ctx;
    this.kind = kind;
    this.connections = [];
    ctx.nodes.push(this);
  }
  connect(target) {
    this.connections.push(target);
    return target;
  }
  disconnect() {
    this.connections = [];
  }
}

class FakeGain extends FakeNode {
  constructor(ctx) {
    super(ctx, 'gain');
    this.gain = new FakeParam(this, 1);
  }
}

class FakeFilter extends FakeNode {
  constructor(ctx) {
    super(ctx, 'filter');
    this.type = 'lowpass';
    this.frequency = new FakeParam(this, 350);
    this.Q = new FakeParam(this, 1);
  }
}

class FakeCompressor extends FakeNode {
  constructor(ctx) {
    super(ctx, 'compressor');
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) this[k] = new FakeParam(this, 0);
  }
}

class FakeSource extends FakeNode {
  constructor(ctx, kind) {
    super(ctx, kind);
    this.type = 'sine';
    this.frequency = new FakeParam(this, 440);
    this.detune = new FakeParam(this, 0);
    this.buffer = null;
    this.loop = false;
    this.onended = null;
    this.started = null;
    this.stopped = null;
  }
  start(t) {
    finite('start time', t === undefined ? 0 : t);
    if (this.started !== null) throw new Error('start called twice');
    this.started = t === undefined ? 0 : t;
    this.ctx.started.push(this);
  }
  stop(t) {
    if (this.started === null) throw new Error('stop before start');
    finite('stop time', t === undefined ? 0 : t);
    this.stopped = t === undefined ? 0 : t;
  }
  end() {
    if (this.onended) this.onended();
  }
}

export class FakeAudioContext {
  constructor() {
    this.nodes = [];
    this.started = [];
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.state = 'suspended';
    this.destination = new FakeNode(this, 'destination');
    this.suspendCount = 0;
    this.resumeCount = 0;
  }
  createGain() {
    return new FakeGain(this);
  }
  createOscillator() {
    return new FakeSource(this, 'osc');
  }
  createBufferSource() {
    return new FakeSource(this, 'buffer');
  }
  createBiquadFilter() {
    return new FakeFilter(this);
  }
  createDynamicsCompressor() {
    return new FakeCompressor(this);
  }
  createBuffer(channels, length) {
    finite('length', length);
    const data = new Float32Array(length);
    return { getChannelData: () => data, length };
  }
  resume() {
    this.resumeCount++;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.suspendCount++;
    this.state = 'suspended';
    return Promise.resolve();
  }
  // Test helper: end every started source, like time passing.
  endAll() {
    for (const s of this.started.slice()) s.end();
  }
}

// Install the fake as the global AudioContext. Returns a function that removes it.
export function installFakeAudio() {
  const had = Object.prototype.hasOwnProperty.call(globalThis, 'AudioContext');
  const old = globalThis.AudioContext;
  let last = null;
  globalThis.AudioContext = class extends FakeAudioContext {
    constructor() {
      super();
      last = this;
    }
  };
  return {
    last: () => last,
    restore() {
      if (had) globalThis.AudioContext = old;
      else delete globalThis.AudioContext;
    },
  };
}
