// Proves the real cheat password text is not written anywhere in the repo.
// We cannot read the password, so we test it the other way: hash every word, phrase and quoted
// string in every text file and check none of them hashes to the stored fingerprint.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CHEAT_HASH, HASH_PREFIX } from '../src/cheats/hash.js';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.gradle', '.idea']);
const MAX_BYTES = 1_500_000;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) yield* walk(p);
    else if (st.size <= MAX_BYTES) yield p;
  }
}

const sha = (t) => createHash('sha256').update(HASH_PREFIX + t).digest('hex');

test('no word, phrase or quoted string in the repo is the cheat password', () => {
  const seen = new Set();
  let files = 0;
  for (const file of walk(process.cwd())) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch { continue; }
    if (text.includes('\u0000')) continue; // skip binary files
    files++;
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed) seen.add(trimmed);
      for (const m of line.matchAll(/(["'`])((?:\\.|(?!\1).){1,120})\1/g)) seen.add(m[2]);
      const words = line.split(/[\s"'`,;:()\[\]{}<>=|]+/).filter(Boolean);
      for (let i = 0; i < words.length; i++) {
        seen.add(words[i]);
        if (i + 1 < words.length) seen.add(words[i] + ' ' + words[i + 1]);
        if (i + 2 < words.length) seen.add(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
      }
    }
  }
  assert.ok(files > 20, 'scan should have found the repo files');
  for (const cand of seen) {
    if (cand.length > 200) continue;
    assert.notEqual(sha(cand), CHEAT_HASH, 'the cheat password text was found in a repo file');
  }
});
