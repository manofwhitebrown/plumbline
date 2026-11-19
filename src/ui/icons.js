// All icons are vector strings drawn in code. No images, no emoji. (UIART-1 rebuild)
// Public API (unchanged): ICONS, iconHtml(name). Added: ICON_IDS, hasIcon, iconAliases.
import { RESOURCES } from './icons/resources.js';
import { NAV } from './icons/nav.js';
import { UI } from './icons/ui.js';
import { BADGES, CREW, ILLO } from './icons/badges.js';

export const ICONS = { ...RESOURCES, ...NAV, ...UI, ...BADGES, ...ILLO };
for (const k of Object.keys(CREW)) ICONS['crew-' + k] = CREW[k];

// Friendly names for the same artwork. Old ids keep working.
export const iconAliases = {
  book: 'codex', chest: 'rewards', anvil: 'workshop', gear: 'settings', gauge: 'depth',
  'colour-blind': 'eye', colorblind: 'eye', 'text-size': 'textsize', vibrate: 'haptics',
  coin: 'gold', crystal: 'shard', dust: 'core', empty: 'illo-empty', locked: 'illo-locked', error: 'illo-error',
  'family-collector': 'badge-collector', 'family-processor': 'badge-processor', 'family-defense': 'badge-defense',
  'family-engine': 'badge-engine', 'family-special': 'badge-special',
};
for (const [a, id] of Object.entries(iconAliases)) if (!ICONS[a]) ICONS[a] = ICONS[id];

export const ICON_IDS = Object.keys(ICONS);
export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(ICONS, name);

export function iconHtml(name) {
  return ICONS[name] || ICONS.star;
}
