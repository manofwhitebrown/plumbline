// Only a fingerprint (hash) of the cheat password is stored. The password itself is not in the repo.
import { sha256Hex } from './sha256.js';

export const CHEAT_HASH = '14182eb005d9c3a83461e15be3d103b3378627d60a39d4f4586634ee673153d5';
export const HASH_PREFIX = 'plumbline:';

// True if sha256('plumbline:' + text) equals the expected hash.
export function matches(text, expectedHash = CHEAT_HASH) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 200) return false;
  return sha256Hex(HASH_PREFIX + text) === String(expectedHash).toLowerCase();
}
