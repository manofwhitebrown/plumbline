// A tiny fake page for tests. It only does what the tutorial needs.

export class FakeEl {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.style = {};
    this.attrs = {};
    this.listeners = {};
    this.className = '';
    this.textContent = '';
    this.parent = null;
    this.box = { left: 0, top: 0, width: 200, height: 60 };
  }
  appendChild(c) {
    this.children.push(c);
    c.parent = this;
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  addEventListener(n, f) {
    (this.listeners[n] = this.listeners[n] || []).push(f);
  }
  click() {
    for (const f of this.listeners.click || []) f();
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this);
    this.parent = null;
  }
  getBoundingClientRect() {
    return { ...this.box };
  }
  all(out = []) {
    for (const c of this.children) {
      out.push(c);
      c.all(out);
    }
    return out;
  }
  querySelectorAll(sel) {
    const m = /^\[data-tut~="(.+)"\]$/.exec(sel);
    if (!m) return [];
    return this.all().filter((e) => (e.getAttribute('data-tut') || '').split(/\s+/).includes(m[1]));
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
}

export function makeFakePage(width = 360, height = 640) {
  const body = new FakeEl('body');
  const head = new FakeEl('head');
  const doc = {
    head,
    body,
    createElement: (t) => new FakeEl(t),
    querySelector: (s) => body.querySelector(s),
    querySelectorAll: (s) => body.querySelectorAll(s),
  };
  const listeners = {};
  const win = {
    innerWidth: width,
    innerHeight: height,
    addEventListener: (n, f) => (listeners[n] = (listeners[n] || []).concat(f)),
    removeEventListener: (n, f) => (listeners[n] = (listeners[n] || []).filter((x) => x !== f)),
    fire: (n) => (listeners[n] || []).forEach((f) => f()),
    count: (n) => (listeners[n] || []).length,
  };
  // Put a marked element on the page.
  function add(name, box, attrs = {}) {
    const el = new FakeEl('div');
    el.setAttribute('data-tut', name);
    for (const k of Object.keys(attrs)) el.setAttribute(k, attrs[k]);
    el.box = box;
    body.appendChild(el);
    return el;
  }
  return { doc, win, body, add };
}

// Fake timers you move by hand.
export function makeTimers() {
  let t = 0;
  let id = 0;
  let queue = [];
  return {
    setTimeout(fn, ms) {
      id++;
      queue.push({ id, at: t + ms, fn });
      return id;
    },
    clearTimeout(x) {
      queue = queue.filter((q) => q.id !== x);
    },
    now: () => t,
    // Move time forward, running everything that comes due.
    advance(ms) {
      const end = t + ms;
      for (;;) {
        queue.sort((a, b) => a.at - b.at);
        const next = queue[0];
        if (!next || next.at > end) break;
        queue.shift();
        t = Math.max(t, next.at);
        next.fn();
      }
      t = end;
    },
    pending: () => queue.length,
  };
}
