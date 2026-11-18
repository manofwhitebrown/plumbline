// Toast and warning lines must fit 60 characters. We read the source for toast(...) calls and rig warnings.
// A fmt() call counts as 8 characters. Pieces that come from other code (error messages) are checked where they are made.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LIMITS } from './integration-layout-helpers.js';

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

// Length of an expression made of 'text' + fmt(x) + 'text'. Unknown pieces count 0.
function worstLength(expr) {
  let best = 0;
  for (const alt of expr.split('||')) {
    let len = 0;
    for (const piece of alt.split(/\s\+\s/)) {
      const p = piece.trim();
      const lit = /^(['"`])(.*)\1$/.exec(p);
      if (lit) len += lit[2].length;
      else if (/^fmt\w*\(/.test(p)) len += LIMITS.fmt;
    }
    best = Math.max(best, len);
  }
  return best;
}

const found = [];
for (const f of walk('src')) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/\btoast\(\s*((?:[^()]|\([^()]*\))*?)\s*,\s*['"](?:ok|warn|error|info)['"]\s*\)/g)) {
      found.push({ where: `${f}:${i + 1}`, expr: m[1] });
    }
    for (const m of line.matchAll(/warnings\.push\(\s*((?:[^()]|\([^()]*\))*?)\s*\)/g)) {
      found.push({ where: `${f}:${i + 1}`, expr: m[1] });
    }
  });
}

test('we found toast and warning lines to check', () => assert.ok(found.length >= 10, 'found ' + found.length));
test('toast and warning lines fit 60 characters', () => {
  const bad = [];
  for (const { where, expr } of found) {
    const len = worstLength(expr);
    if (len > LIMITS.toast) bad.push(`${where}: ${len} characters (max ${LIMITS.toast}): ${expr}`);
  }
  assert.deepEqual(bad, []);
});
