// Solara Bay v2 3D screenshot scenes for ?shot=start|drive|chase|mission.
// Each scene plays the real rules forward from a fresh world for a fixed
// time, steered by a simple road-following autopilot, so the frame is what
// a short game really looks like and the same seed always gives it. The
// 3D renderer paints the scene; main.js renders many frames before
// setting window.__shotReady, so the 3D scene is fully lit and settled.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];

function nearestCenter(value) {
  let best = ROAD_CENTERS[0];
  for (const c of ROAD_CENTERS) if (Math.abs(value - c) < Math.abs(value - best)) best = c;
  return best;
}

// Autopilot with unstick: if the car is throttling but stays under
// 40 speed for over a second, it is wedged against a building corner —
// reverse out with opposite lock for a second, then resume the route.
// Without this the staged shots end with the car parked at 3 km/h.
function makeDriveInput(target) {
  let stuck = 0;
  let unstick = 0;
  const idle = { throttle: () => 0, steer: () => 0, moveX: () => 0, moveY: () => 0, run: false };
  return (state) => {
    const car = state.player.car;
    if (!car) return idle;
    if (unstick > 0) {
      unstick -= STEP;
      return { throttle: () => -1, steer: () => -0.8, moveX: () => 0, moveY: () => 0, run: false };
    }
    if (Math.abs(car.speed) < 40) stuck += STEP;
    else stuck = 0;
    if (stuck > 1.2) {
      stuck = 0;
      unstick = 0.9;
      return { throttle: () => -1, steer: () => -0.8, moveX: () => 0, moveY: () => 0, run: false };
    }
    const column = nearestCenter(target.x);
    let waypoint;
    if (Math.abs(car.x - column) > 60) waypoint = { x: column, y: nearestCenter(car.y) };
    else waypoint = { x: column, y: target.y };
    const desired = Math.atan2(waypoint.y - car.y, waypoint.x - car.x);
    let diff = desired - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 2));
    // Slow down for sharp turns: at full speed the car overshoots the
    // corner, cuts across a building block, and wedges between buildings.
    const throttle = Math.abs(diff) > 0.6 ? 0.55 : 1;
    return {
      throttle: () => throttle,
      steer: () => steer,
      moveX: () => 0,
      moveY: () => 0,
      run: false,
    };
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
    world.step(STEP, inputFor(world.state), { enter: false, punch: false, shoot: false, jump: false });
    if (world.state.over) break;
  }
  world.state.player.health = 100;
  world.state.player.invuln = 0;
  world.state.over = false;
  world.state.busted = false;
}

// The four submission shots are start, drive, chase and mission. The
// extra 'hunt' scene is a test-only staging for mission 8 and is never
// saved into screenshots/ — the submission always ships exactly 4 shots.
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  // Daytime for the title shot: bright and clean, the modern PUBG-like
  // look the brief asks for. Sunset is kept for the chase/mission shots.
  if (name !== 'drive' && name !== 'chase' && name !== 'mission' && name !== 'hunt') {
    state.timeOfDay = 0.3;
    runSteps(world, 5, () => ({ throttle: () => 0, steer: () => 0, moveX: () => 0, moveY: () => 0, run: false }));
    state.player.x = 700;
    state.player.y = 560;
    // Face the sunset for the title frame so Mara reads in the shot.
    state.player.angle = Math.PI / 4;
    return { screen: SCREEN_TITLE, best: state.player.cash };
  }

  if (name === 'drive') {
    state.timeOfDay = 0.3;
    state.player.x = 680;
    state.player.y = 600;
    world.enterCar();
    // One persistent input closure for the whole run, so its unstick
    // state survives from step to step. The route runs east then south;
    // it stops short of the pier on purpose — ending at the pier puts
    // the wooden pier deck right between the camera and the car, and the
    // deck fills the whole foreground of the frame. Only 7 s: the car is
    // still moving down the road at speed, not parked past the target
    // near the beach where a dark building fills the camera's view.
    runSteps(world, 7, makeDriveInput({ x: 2600, y: 1800 }));
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }

  if (name === 'chase') {
    state.timeOfDay = 0.55;
    state.player.x = 680;
    state.player.y = 600;
    world.enterCar();
    state.wanted = 3;
    state.crimeTimer = 0;
    runSteps(world, 7, makeDriveInput({ x: 2600, y: 600 }));
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }

  if (name === 'hunt') {
    // Test scene for mission 8 (not one of the 4 submission shots):
    // Mara starts the hunt in a car, outruns the Viper pack to the pier
    // while the snitch leaks her position, then drives to the Hideout
    // after the 25 s survival timer to finish the mission.
    state.timeOfDay = 0.55;
    state.missionIndex = 7;
    state.mission = world.missions.current(7);
    state.player.x = 680;
    state.player.y = 600;
    world.enterCar();
    runSteps(world, 24, makeDriveInput({ x: 2600, y: 2200 }));
    // The return leg is slow: the Viper pack and police keep ramming the
    // car, so the autopilot needs a long window to reach the Hideout.
    runSteps(world, 35, makeDriveInput({ x: 600, y: 640 }));
    return { screen: SCREEN_PLAY, best: state.player.cash };
  }

  // mission: Mara in mission 2, driving to the pier with rivals about,
  // at sunset so the neon reads in the frame. Only 8 s of driving: the
  // car is still moving down the road toward the pier, not parked on it
  // — parking at the pier puts the pier deck across the whole frame.
  state.timeOfDay = 0.52;
  state.missionIndex = 1;
  state.mission = world.missions.current(1);
  state.player.x = 680;
  state.player.y = 600;
  world.enterCar();
  world.spawnRival(2600, 1800);
  world.spawnRival(2200, 2200);
  runSteps(world, 8, makeDriveInput({ x: 2600, y: 2200 }));
  return { screen: SCREEN_PLAY, best: state.player.cash };
}

export { nearestCenter };
