// Secret scan. Looks at every tracked text file (and .git/config).
// Prints only the FILE NAME and the kind of problem. It never prints the match.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

// Patterns are built from pieces so this file does not match itself.
const J = (...p) => p.join('');
const RULES = [
  { name: 'GitHub fine-grained token', re: new RegExp(J('github', '_pat_', '[A-Za-z0-9_]{10,}')) },
  { name: 'GitHub token', re: new RegExp(J('gh', '[pousr]', '_', '[A-Za-z0-9]{20,}')) },
  { name: 'AWS access key', re: new RegExp(J('AK', 'IA', '[0-9A-Z]{16}')) },
  { name: 'Private key block', re: new RegExp(J('-----', 'BEGIN ', '[A-Z ]*', 'PRIVATE KEY', '-----')) },
  { name: 'Token in a URL or header', re: new RegExp(J('x-access', '-token', ':')) }
];

function listFiles() {
  try {
    const out = execSync('git ls-files -z', { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    return out.toString('utf8').split('\0').filter(Boolean);
  } catch {
    return [];
  }
}

// Binary files have zero bytes in them. Skip those.
function isText(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
}

export function scanText(text) {
  const hits = [];
  for (const rule of RULES) if (rule.re.test(text)) hits.push(rule.name);
  return hits;
}

function main() {
  const files = listFiles();
  if (existsSync('.git/config')) files.push('.git/config');
  let bad = 0;
  for (const file of files) {
    if (!existsSync(file)) continue;
    let buf;
    try { buf = readFileSync(file); } catch { continue; }
    if (!isText(buf)) continue;
    const hits = scanText(buf.toString('utf8'));
    for (const h of hits) {
      console.error(`SECRET FOUND in ${file}: ${h}`);
      bad++;
    }
  }
  if (bad > 0) {
    console.error(`Secret scan failed: ${bad} problem(s). Remove the secret and tell the Manager.`);
    process.exit(1);
  }
  console.log(`Secret scan passed (${files.length} files).`);
}

// Run only when called from the command line (so tests can import scanText).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
