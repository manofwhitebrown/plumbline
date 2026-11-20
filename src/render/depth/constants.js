// DEPTH-1 tuning constants. One place for every number you might want to change.
// Everything is in CSS pixels and metres of well depth unless the name says otherwise.

export const BIOME_ORDER = ['clay', 'quartz', 'amber', 'magma', 'void', 'abyss'];
// End depth (m) of clay, quartz, amber, magma, void. Same as CONTRACT section 7 and polish/util.js (a test keeps them equal).
export const BIOME_EDGES = [100, 250, 450, 700, 1000];
export const BLEND_M = 15;            // the wall set cross-fades over the last 15 m before an edge

export const LEVELS = ['low', 'medium', 'high'];

// Perspective. The vanishing row sits below the bucket (and below the screen). Rows near the bottom are FAR.
export const GEOM = {
  vanishK: 1.5,      // vanishing row = H * vanishK (never closer than H + OV + 40)
  refK: 0.4,         // reference row (about the bucket) = H * refK
  dRef: 12,          // metres: a feature this far below the camera plane appears on the reference row
  rpm: 60,           // wall texture rows per metre of depth (sets the scroll speed at the reference row)
  w0K: 0.085,        // wall width at the top of the screen, as a share of W
  wFarK: 0.24,       // wall width at the bottom, as a share of W
  curve: 1.6,        // >1 bows the wall inner edge (fast near the top, flat at the bottom)
};

export const OV = 26;                 // overscan (px) so roll, zoom and shake never show the layer edge
export const TEX_W = 160;             // wall texture size (one tile; stored doubled vertically)
export const TEX_H = 192;
export const COURSE_H = 32;           // stone course height inside the texture (TEX_H / COURSE_H must be an integer)
export const SLICE_PX = { high: 8, medium: 14 };
export const SLICE_MAX = 400;         // table capacity (covers H up to ~2300 px at 6 px slices)
export const LAYER_SCALE = { high: 1.25, medium: 0.75 }; // layer resolution relative to CSS px, capped by dpr

// Camera (hard caps, also enforced by clampCam in camera.js).
export const CAM = { shakePx: 6, rollDeg: 1.5, zoomMax: 1.03, swayPx: 3, fgSwayMul: 1.6 };

// Foreground silhouettes.
export const FG = {
  spacingM: 22,      // average depth between silhouettes on one side
  K: 1500,           // screen travel constant: y = vanish - K / dz
  dzMax: 5.5,        // metres below the camera plane where a silhouette enters (bottom edge)
  dzMin: 1.4,        // and where it has left the top
  scaleRef: 1,       // sprite scale at dz = dzRefF
  dzRefF: 2.2,
  maxPerSide: 3,
  hudTop: 88, hudBottom: 120, hudAlpha: 0.35,
  guardPx: 18,       // gap kept between a silhouette and the bucket rim (pad 12 + 6)
  minIntrude: 6, maxIntrude: 74,
  topIntrudeK: 0.34, topIntrudeMax: 130, // above the bucket there are no lanes: silhouettes may reach this far in (share of W)
  maskFeatherY: 70, maskFeatherX: 14,
};

// Light.
export const LIGHT = {
  lobeAlpha: 0.42,   // lantern light on the near wall
  centerAlpha: 0.0,  // nothing is added over the lanes
  flicker: 0.12,     // max 15 percent per art direction
  pulseAlpha: 0.34, pulseAttackMs: 70, pulseDecayMs: 720, pulseSlots: 6,
  breathHz: 0.07, breathAmp: 0.045,
  fogMax: 0.55,
};

// Per-biome look beyond the shared palette: fog tint (mixed from palette), crack glow, silhouette set.
export const STYLE = {
  clay:   { crack: 0.10, fog: '#1b1410', sil: ['root', 'plank', 'ladder'] },
  quartz: { crack: 0.22, fog: '#0b1020', sil: ['crystal', 'stalactite'] },
  amber:  { crack: 0.50, fog: '#1a1006', sil: ['root', 'plank', 'pipe'] },
  magma:  { crack: 0.85, fog: '#14070a', sil: ['stalactite', 'pipe', 'crystal'] },
  void:   { crack: 0.45, fog: '#05030d', sil: ['crystal', 'root'] },
  abyss:  { crack: 0.55, fog: '#020108', sil: ['root', 'crystal', 'stalactite', 'ladder', 'plank', 'pipe'] },
};

// Cost governor: if the layer's own time stays over budget the quality steps down one level (never back up on its own).
export const BUDGET_MS = 3;
export const GOV_FRAMES = 90;
