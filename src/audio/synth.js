// WebAudio helpers. First version: safe stubs. The real voices come next.

// Returns null when WebAudio is missing. Never throws.
export function createContext() {
  try {
    const Ctor = typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext);
    return Ctor ? new Ctor() : null;
  } catch (e) {
    return null;
  }
}

export const MAX_VOICES = 16;
