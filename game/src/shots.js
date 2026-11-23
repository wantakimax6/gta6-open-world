// Screenshot scenes for ?shot=start|drive|chase|mission.
// Each scene plays the real rules forward from a fresh world for a fixed
// time, steered by a simple road-following autopilot, so the frame is what
// a short game really looks like and the same seed always gives it.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];

function nearestCenter(value) {
  let best = ROAD_CENTERS[0];
  for (const c of ROAD_CENTERS) if (Math.abs(value - c) < Math.abs(value - best)) best = c;
  return best;
}

// Drive toward a target along the road grid: first travel east/west along
// the current road to the target's column, then turn and travel north/south
// along that road to the target. Staying on roads keeps the car out of
// buildings and off the sidewalks (and their pedestrians).
function autopilotDrive(state, target) {
  const car = state.player.car;
  if (!car) return { throttle: () => 0, steer: () => 0, moveX: () => 0, moveY: () => 0, run: false };
  const column = nearestCenter(target.x);
  let waypoint;
  // First reach the road column nearest the target, travelling along the
  // current road; only once on that column, turn and travel along it to
  // the target. Turning anywhere else would cut across a building block.
  if (Math.abs(car.x - column) > 60) waypoint = { x: column, y: nearestCenter(car.y) };
  else waypoint = { x: column, y: target.y };
  const desired = Math.atan2(waypoint.y - car.y, waypoint.x - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  // Proportional steering, not bang-bang: a gentle turn near the desired
  // heading keeps the car on the road instead of clipping building corners.
  const steer = Math.max(-1, Math.min(1, diff * 2));
  // Keep the throttle on even in a sharp turn: steering only works while
  // the car is moving, so stopping would leave it stuck facing the wrong way.
  return {
    throttle: () => 1,
    steer: () => steer,
    moveX: () => 0,
    moveY: () => 0,
    run: false,
  };
}

function autopilotWalk(state, target) {
  const p = state.player;
  const dx = target.x - p.x;
  const dy = target.y - p.y;
  return {
    throttle: () => 0,
    steer: () => 0,
    moveX: () => (Math.abs(dx) > 30 ? Math.sign(dx) : 0),
    moveY: () => (Math.abs(dy) > 30 ? Math.sign(dy) : 0),
    run: true,
  };
}

function runSteps(world, seconds, inputFor) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, inputFor(world.state), { enter: false, punch: false, shoot: false });
    if (world.state.over) break;
  }
  // A staged shot shows the game mid-play, not the moment a rammed
  // autopilot happened to die: restore full health for the frame.
  world.state.player.health = 100;
  world.state.over = false;
  world.state.busted = false;
}

export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'drive' && name !== 'chase' && name !== 'mission') {
    runSteps(world, 5, () => ({ throttle: () => 0, steer: () => 0, moveX: () => 0, moveY: () => 0, run: false }));
    state.player.x = 700;
    state.player.y = 560;
    state.camera.x = Math.max(0, 700 - 640);
    state.camera.y = Math.max(0, 560 - 360);
    return { screen: SCREEN_TITLE, best: state.player.cash };
  }

  if (name === 'drive') {
    // Stand beside the parked red car first, so entering it always works.
    state.player.x = 680;
    state.player.y = 600;
    world.enterCar();
    runSteps(world, 9, (s) => autopilotDrive(s, { x: 1800, y: 1800 }));
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }

  if (name === 'chase') {
    state.player.x = 680;
    state.player.y = 600;
    world.enterCar();
    state.wanted = 3;
    state.crimeTimer = 0;
    runSteps(world, 7, (s) => autopilotDrive(s, { x: 2600, y: 600 }));
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }

  // mission: put Mara in mission 2, driving to the pier with rivals about.
  state.missionIndex = 1;
  state.mission = world.missions.current(1);
  state.player.x = 680;
  state.player.y = 600;
  world.enterCar();
  // Rivals wait on the roads by the pier, where they can actually stand.
  world.spawnRival(2600, 1800);
  world.spawnRival(2200, 2200);
  runSteps(world, 18, (s) => autopilotDrive(s, { x: 2600, y: 2200 }));
  return { screen: SCREEN_PLAY, best: state.player.cash };
}

export { nearestCenter };
