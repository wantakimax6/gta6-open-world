// Solara Bay: every tuning number in one place.
// A sun-soaked coastal city, 3200 by 2400 world units, on a road grid.
export const WORLD = { width: 3200, height: 2400, roadEvery: 400, roadWidth: 96 };

export const STEP = 1 / 60;
export const SAVE_KEY = 'solara-bay-save-v1';
export const BEST_KEY = 'solara-bay-best-v1';

export const PLAYER = {
  walkSpeed: 190,
  runSpeed: 265,
  radius: 14,
  health: 100,
  punchDamage: 14,
  punchRange: 48,
  punchCooldown: 0.35,
  shootCooldown: 0.28,
  startAmmo: 24,
  maxAmmo: 60,
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
  // A ram stings but does not end a run on its own: the chase should be
  // survivable long enough to escape, on foot and in a car.
  ramDamage: 3,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  stealCar: 1,
  shoot: 1,
  hitPedestrian: 1,
};

export const MISSION_REWARDS = [150, 300, 450, 700, 1200];

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
  // On the 2600 / 2200 road intersection, at the south-east pier district:
  // a target inside a building block would be unreachable by car.
  pier: { x: 2600, y: 2200, label: 'Solara Pier' },
  bank: { x: 1800, y: 1000, label: 'Bay Bank' },
};
