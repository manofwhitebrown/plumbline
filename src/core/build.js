// The build label for Settings, e.g. "Plumbline v0.1.0 · build abc1234 · 2026-11-18".
// Vite fills in __BUILD__. In Node tests it is not defined, so we use a plain fallback.
export const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'Plumbline v0.1.0 · build dev';
export default BUILD;
