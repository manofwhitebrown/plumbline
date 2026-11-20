// Crew looks: colours and props for the small Home characters. Pure data, built once.
const mix = (hex, k) => { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))); return '#' + ((1 << 24) | (c(16) << 16) | (c(8) << 8) | c(0)).toString(16).slice(1); };
function look(o) {
  return Object.assign({ h: 1, hair: 'short', hairC: '#3a2616', prop: 'none', lampOn: false }, o, {
    skinD: mix(o.skin, 0.76), shirtD: mix(o.shirt, 0.7), shirtL: mix(o.shirt, 1.22), pantsD: mix(o.pants, 0.7), capD: mix(o.cap || o.hairC || '#333333', 0.7),
  });
}
// Index 0 turns the crank (stands on the left), 1 wears the headlamp, 2 carries a pickaxe, 3 hauls a rope, 4 carries a sack, 5 waves.
export const LOOKS = [
  look({ h: 1.0, skin: '#e0ac86', hair: 'cap', cap: '#3f7f86', hairC: '#3a2616', shirt: '#6e8aa6', pants: '#3b3040', boot: '#2a1b14', prop: 'crank' }),
  look({ h: 1.06, skin: '#c98e65', hair: 'helmet', cap: '#d8a31f', hairC: '#2a1a10', shirt: '#c78a2c', pants: '#4a3a2c', boot: '#2a1b14', prop: 'lamp' }),
  look({ h: 0.96, skin: '#f0c09a', hair: 'bandana', cap: '#b3402e', hairC: '#2c2a2a', shirt: '#a8553a', pants: '#2e3a4a', boot: '#3a2418', prop: 'pick' }),
  look({ h: 1.12, skin: '#a8714d', hair: 'hat', cap: '#6b4a2a', hairC: '#201610', shirt: '#5c8a4e', pants: '#6a5338', boot: '#2a1b14', prop: 'rope' }),
  look({ h: 0.9, skin: '#f2c9a5', hair: 'long', cap: '#7a3a1c', hairC: '#7a3a1c', shirt: '#8a5a9a', pants: '#352a44', boot: '#4a2a1c', prop: 'sack' }),
  look({ h: 0.98, skin: '#8a5a3d', hair: 'hood', cap: '#d8742f', hairC: '#1c1410', shirt: '#d8742f', pants: '#3a3f55', boot: '#2a1b14', prop: 'wave' }),
  look({ h: 1.03, skin: '#e8b48c', hair: 'short', hairC: '#1e1e22', shirt: '#3f8fa0', pants: '#4a4036', boot: '#2a1b14', prop: 'none' }),
  look({ h: 0.94, skin: '#b9825c', hair: 'hat', cap: '#8a2f3b', hairC: '#2a1a10', shirt: '#d9cfae', pants: '#35465a', boot: '#2a1b14', prop: 'none' }),
];
export const LOOK_COUNT = LOOKS.length;
