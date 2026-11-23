// Solara Bay v2 3D: every tuning number in one place.
// The simulation still runs on the v1 city plane (3200 by 2400 units, road
// grid every 400); the 3D renderer maps it with SCALE (1 sim unit = 0.05 m)
// so the city is 160 by 120 metres, a player is ~1.8 m tall, a car ~4.4 m.
// Sunset Vice City palette: warm pinks, teals and neon.
export const SCALE = 0.05;
export const WORLD = { width: 3200, height: 2400, roadEvery: 400, roadWidth: 96 };

export const STEP = 1 / 60;
export const SAVE_KEY = 'solara-bay-save-v2';
export const BEST_KEY = 'solara-bay-best-v2';

export const PLAYER = {
  walkSpeed: 190,
  runSpeed: 265,
  radius: 14,
  height: 36,
  health: 100,
  punchDamage: 14,
  punchRange: 48,
  punchCooldown: 0.35,
  shootCooldown: 0.28,
  startAmmo: 24,
  maxAmmo: 60,
  jumpSpeed: 260,
  gravity: 900,
  // A car hit above this speed throws Mara into a full ragdoll.
  ragdollSpeed: 180,
};

export const CAR = {
  accel: 640,
  brake: 920,
  reverseAccel: 330,
  maxSpeed: 560,
  maxReverse: 180,
  steer: 2.6,
  grip: 3.2,
  length: 54,
  width: 26,
};

export const POLICE = {
  accel: 570,
  maxSpeed: 525,
  catchRange: 44,
  arrestTime: 2.2,
  ramDamage: 3,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  stealCar: 1,
  shoot: 1,
  hitPedestrian: 1,
};

// Rewards for the eight missions, in order. Mission 8 (the hunt) pays
// $500 — less than the heist, because surviving the pack is the point.
export const MISSION_REWARDS = [150, 300, 450, 700, 1200, 500, 900, 500];

// How long a ragdoll tumbles before Mara gets back up.
export const RAGDOLL_RECOVER_SECONDS = 1.5;

export const COLORS = {
  grass: '#7fb069',
  sand: '#e8d29a',
  water: '#2f7fb8',
  road: '#3a3f4a',
  roadLine: '#e8d44d',
  sidewalk: '#9aa0a8',
  park: '#5da24a',
};

export const ROOF_COLORS = ['#c96f4a', '#4a7fc9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a6e'];

export const CITY = {
  name: 'Solara Bay',
  hero: 'Mara Voss',
  crew: 'Harbor Crew',
  hideout: { x: 600, y: 600, label: 'Hideout' },
  garage: { x: 2600, y: 600, label: 'Garage' },
  market: { x: 600, y: 1800, label: 'Harbor Market' },
  pier: { x: 2600, y: 2200, label: 'Solara Pier' },
  bank: { x: 1800, y: 1000, label: 'Bay Bank' },
  strip: { x: 1800, y: 1400, label: 'Neon Strip' },
  beach: { x: 1400, y: 2200, label: 'Sunset Beach' },
};

// Quality presets: shadow map size, pixel ratio cap, draw distance.
// High is the default; the HUD quality buttons switch these live.
export const QUALITY = {
  // Shadow maps are kept modest: a 2048 map costs far more than it shows
  // at this city scale, and software renderers choke on it.
  low: { shadows: false, pixelRatio: 1, shadowSize: 512, far: 280 },
  medium: { shadows: true, pixelRatio: 1.25, shadowSize: 1024, far: 320 },
  high: { shadows: true, pixelRatio: 1.5, shadowSize: 1024, far: 420 },
};
