// Only a fingerprint (hash) of the cheat password is stored. The password itself is not in the repo.
import { sha256Hex } from './sha256.js';

export const CHEAT_HASH = 'b85d292c3e966494bfd0a56c529da8e7ad0b8e1847df0abda4e91208d569972b';
export const HASH_PREFIX = 'plumbline:';

// True if sha256('plumbline:' + text) equals the expected hash.
export function matches(text, expectedHash = CHEAT_HASH) {
  if (typeof text !== 'string' || text.length === 0 || text.length > 200) return false;
  return sha256Hex(HASH_PREFIX + text) === String(expectedHash).toLowerCase();
}
