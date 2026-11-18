// Tiny DOM helpers. No framework. A scope remembers listeners so we can remove them all.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k === 'html') el.innerHTML = v; // only used with our own trusted strings
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function svg(markup, cls) {
  const t = document.createElement('span');
  t.className = 'icon' + (cls ? ' ' + cls : '');
  t.setAttribute('aria-hidden', 'true');
  t.innerHTML = markup; // our own icon strings only
  return t;
}

export function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text; // only touch the DOM when it changes
}

// A scope tracks listeners, timers and bus subscriptions so unmount can clean up in one call.
export function createScope() {
  const offs = [];
  let dead = false;
  return {
    on(target, type, fn, opts) {
      if (dead || !target || typeof target.addEventListener !== 'function') return () => {};
      target.addEventListener(type, fn, opts);
      const off = () => target.removeEventListener(type, fn, opts);
      offs.push(off);
      return off;
    },
    sub(bus, name, fn) {
      if (dead || !bus || typeof bus.on !== 'function') return () => {};
      const off = bus.on(name, fn);
      offs.push(off);
      return off;
    },
    timeout(fn, ms) {
      const id = setTimeout(fn, ms);
      offs.push(() => clearTimeout(id));
      return id;
    },
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      offs.push(() => clearInterval(id));
      return id;
    },
    add(off) { if (typeof off === 'function') offs.push(off); },
    count() { return offs.length; },
    dispose() {
      dead = true;
      while (offs.length) {
        try { offs.pop()(); } catch (e) { /* keep cleaning */ }
      }
    },
  };
}
