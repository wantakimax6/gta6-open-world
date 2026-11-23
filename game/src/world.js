// Solara Bay world: the city, the player, cars, pedestrians, rivals,
// wanted level, health and cash. No drawing and no browser here: step()
// advances one fixed step and returns what happened as bit flags.
import { CAR, CITY, PLAYER, POLICE, WANTED, WORLD, MISSION_REWARDS } from './config.js';
import { createMissions } from './missions.js';
import { updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';

export const EVENT_HIT = 1;
export const EVENT_COIN = 2;
export const EVENT_OVER = 4;
export const EVENT_MISSION = 8;
export const EVENT_CRIME = 16;
export const EVENT_BUSTED = 32;
export const EVENT_PICKUP = 64;

const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
const CAR_COLORS = ['#e5534b', '#4a7fc9', '#f2c94c', '#7fb069', '#c94a6e', '#e8e8e8', '#2a2f3a', '#ff8c42'];

function clamp(value, low, high) { return Math.min(high, Math.max(low, value)); }
function dist2(ax, ay, bx, by) { const dx = ax - bx; const dy = ay - by; return dx * dx + dy * dy; }

export function isOnRoad(x, y) {
  for (const c of ROAD_CENTERS) {
    if (Math.abs(x - c) < WORLD.roadWidth / 2 + 6) return true;
    if (Math.abs(y - c) < WORLD.roadWidth / 2 + 6) return true;
  }
  return false;
}

export function createWorld(random) {
  const buildings = [];
  const parks = [];
  // One block per gap between roads; each block holds buildings or a park.
  for (let bx = 0; bx < ROAD_CENTERS.length - 1; bx += 1) {
    for (let by = 0; by < ROAD_CENTERS.length - 1; by += 1) {
      const x0 = ROAD_CENTERS[bx] + WORLD.roadWidth / 2 + 14;
      const y0 = ROAD_CENTERS[by] + WORLD.roadWidth / 2 + 14;
      const x1 = ROAD_CENTERS[bx + 1] - WORLD.roadWidth / 2 - 14;
      const y1 = ROAD_CENTERS[by + 1] - WORLD.roadWidth / 2 - 14;
      if (x1 - x0 < 60 || y1 - y0 < 60) continue;
      if (random() < 0.16) { parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }); continue; }
      const split = random() < 0.5;
      if (split) {
        const mid = x0 + (x1 - x0) * (0.4 + random() * 0.2);
        buildings.push({ x: x0, y: y0, w: mid - x0 - 10, h: y1 - y0, color: '#c96f4a' });
        buildings.push({ x: mid + 10, y: y0, w: x1 - mid - 10, h: y1 - y0, color: '#4a7fc9' });
      } else {
        buildings.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, color: '#c9a44a' });
      }
    }
  }
  // Re-colour buildings with a seeded shuffle so the city is not striped.
  const roofPalette = ['#c96f4a', '#4a7fc9', '#c9a44a', '#7a4ac9', '#4ac9a0', '#c94a6e', '#8a6d4b', '#5b7a99'];
  for (const b of buildings) b.color = roofPalette[Math.floor(random() * roofPalette.length)];

  const missions = createMissions();
  const state = {
    buildings, parks,
    player: { x: 600, y: 640, angle: -Math.PI / 2, speed: 0, health: PLAYER.health, cash: 0, ammo: PLAYER.startAmmo, inCar: false, car: null, punchTimer: 0, shootTimer: 0, invuln: 0 },
    cars: [], peds: [], rivals: [], police: [], particles: [], pickups: [],
    wanted: 0, wantedTimer: 0, crimeTimer: 0, arrestTimer: 0,
    missionIndex: 0, mission: missions.current(0), missionTimer: 0, missionHold: 0,
    score: 0, elapsed: 0, busted: false, over: false, overReason: '',
    camera: { x: 600, y: 640 },
  };

  function spawnCar(x, y, angle, color, kind) {
    const car = { x, y, angle, speed: 0, color: color || CAR_COLORS[Math.floor(random() * CAR_COLORS.length)], kind: kind || 'parked', axis: 'x', dir: 1, cruise: 120 + random() * 80 };
    state.cars.push(car);
    return car;
  }

  function spawnTrafficCar() {
    const horizontal = random() < 0.5;
    const center = ROAD_CENTERS[Math.floor(random() * ROAD_CENTERS.length)];
    const along = 100 + random() * (WORLD.width - 200);
    const car = horizontal
      ? spawnCar(along, center + (random() < 0.5 ? -22 : 22), random() < 0.5 ? 0 : Math.PI, null, 'traffic')
      : spawnCar(center + (random() < 0.5 ? -22 : 22), along, random() < 0.5 ? Math.PI / 2 : -Math.PI / 2, null, 'traffic');
    car.axis = horizontal ? 'x' : 'y';
    car.dir = car.angle === 0 || car.angle === Math.PI / 2 ? 1 : -1;
    car.speed = car.cruise;
    return car;
  }

  function spawnPed() {
    const center = ROAD_CENTERS[Math.floor(random() * ROAD_CENTERS.length)];
    const along = 100 + random() * (WORLD.width - 200);
    const horizontal = random() < 0.5;
    return { x: horizontal ? along : center + 60, y: horizontal ? center + 60 : along, angle: random() * Math.PI * 2, speed: 28 + random() * 30, color: ['#f2c94c', '#e8e8e8', '#4ac9a0', '#c94a6e'][Math.floor(random() * 4)], flee: 0 };
  }

  function spawnRival(x, y) {
    const rival = { x, y, angle: 0, health: 40, speed: 95, shootTimer: 1 + random(), alive: true };
    state.rivals.push(rival);
    return rival;
  }

  function addParticle(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push({ x, y, vx: (random() - 0.5) * 220, vy: (random() - 0.5) * 220, life: 0.5 + random() * 0.4, color });
    }
  }

  function addWanted(amount) {
    if (amount <= 0) return;
    state.wanted = Math.min(WANTED.max, state.wanted + amount);
    state.crimeTimer = 0;
    state.wantedTimer = 0;
  }

  function buildingHit(x, y, radius) {
    for (const b of state.buildings) {
      if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return b;
    }
    return null;
  }

  function pushOutOfBuildings(entity, radius) {
    const b = buildingHit(entity.x, entity.y, radius);
    if (!b) return false;
    const left = entity.x + radius - b.x;
    const right = b.x + b.w - (entity.x - radius);
    const top = entity.y + radius - b.y;
    const bottom = b.y + b.h - (entity.y - radius);
    const smallest = Math.min(left, right, top, bottom);
    if (smallest === left) entity.x = b.x - radius;
    else if (smallest === right) entity.x = b.x + b.w + radius;
    else if (smallest === top) entity.y = b.y - radius;
    else entity.y = b.y + b.h + radius;
    return true;
  }

  function reset() {
    const p = state.player;
    p.x = 600; p.y = 640; p.angle = -Math.PI / 2; p.speed = 0;
    p.health = PLAYER.health; p.cash = 0; p.ammo = PLAYER.startAmmo;
    p.inCar = false; p.car = null; p.punchTimer = 0; p.shootTimer = 0; p.invuln = 0;
    state.cars = []; state.peds = []; state.rivals = []; state.police = [];
    state.particles = []; state.pickups = [];
    state.wanted = 0; state.wantedTimer = 0; state.crimeTimer = 0; state.arrestTimer = 0;
    state.missionIndex = 0; state.mission = missions.current(0); state.missionTimer = 0; state.missionHold = 0;
    state.score = 0; state.elapsed = 0; state.busted = false; state.over = false; state.overReason = '';
    // Parked cars near the start, traffic, pedestrians and a few cash pickups.
    spawnCar(700, 600, 0, '#e5534b', 'parked');
    spawnCar(600, 500, Math.PI / 2, '#4a7fc9', 'parked');
    spawnCar(2600, 600, 0, '#ff8c42', 'parked');
    for (let i = 0; i < 13; i += 1) spawnTrafficCar();
    for (let i = 0; i < 22; i += 1) state.peds.push(spawnPed());
    state.pickups.push({ x: 1000, y: 600, kind: 'cash', amount: 50, taken: false });
    state.pickups.push({ x: 1400, y: 1800, kind: 'ammo', amount: 12, taken: false });
    state.pickups.push({ x: 2200, y: 1000, kind: 'health', amount: 40, taken: false });
    state.pickups.push({ x: 1800, y: 1400, kind: 'cash', amount: 80, taken: false });
  }

  function nearestCar(maxDist) {
    let best = null; let bestD = maxDist * maxDist;
    for (const car of state.cars) {
      if (car.kind === 'player') continue;
      const d = dist2(state.player.x, state.player.y, car.x, car.y);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  function enterCar() {
    const car = nearestCar(78);
    if (!car) return false;
    if (car.kind === 'traffic') { addWanted(WANTED.stealCar); }
    car.kind = 'player';
    state.player.inCar = true;
    state.player.car = car;
    state.player.x = car.x; state.player.y = car.y; state.player.angle = car.angle;
    return true;
  }

  function exitCar() {
    const car = state.player.car;
    if (!car) return false;
    car.kind = 'parked';
    car.speed = 0;
    state.player.inCar = false;
    state.player.car = null;
    state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 48;
    state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 48;
    state.player.speed = 0;
    return true;
  }

  function punch() {
    const p = state.player;
    if (p.punchTimer > 0 || p.inCar) return 0;
    p.punchTimer = PLAYER.punchCooldown;
    let events = 0;
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      if (dist2(p.x, p.y, rival.x, rival.y) < PLAYER.punchRange * PLAYER.punchRange) {
        rival.health -= PLAYER.punchDamage;
        addParticle(rival.x, rival.y, '#f2c94c', 6);
        if (rival.health <= 0) { rival.alive = false; p.cash += 50; state.score += 50; events |= EVENT_COIN; }
        break;
      }
    }
    return events;
  }

  function shoot() {
    const p = state.player;
    if (p.shootTimer > 0 || p.ammo <= 0) return 0;
    p.shootTimer = PLAYER.shootCooldown;
    p.ammo -= 1;
    addWanted(WANTED.shoot);
    let best = null; let bestD = 340 * 340;
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      const d = dist2(p.x, p.y, rival.x, rival.y);
      if (d < bestD) { bestD = d; best = rival; }
    }
    if (best) {
      best.health -= 26;
      addParticle(best.x, best.y, '#e5534b', 8);
      if (best.health <= 0) { best.alive = false; p.cash += 50; state.score += 50; }
      return EVENT_COIN;
    }
    return 0;
  }

  function step(dt, input, actions) {
    const p = state.player;
    let events = 0;
    state.elapsed += dt;
    if (p.punchTimer > 0) p.punchTimer -= dt;
    if (p.shootTimer > 0) p.shootTimer -= dt;
    if (p.invuln > 0) p.invuln -= dt;
    state.crimeTimer += dt;

    // One-shot actions.
    if (actions.enter) {
      if (p.inCar) exitCar();
      else if (enterCar()) events |= EVENT_CRIME;
    }
    if (actions.punch) events |= punch();
    if (actions.shoot) events |= shoot();

    if (p.inCar && p.car) {
      const car = p.car;
      const throttle = input.throttle();
      const steer = input.steer();
      if (throttle > 0) car.speed += CAR.accel * dt;
      else if (throttle < 0) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverseAccel) * dt * -throttle;
      else car.speed -= car.speed * 0.9 * dt;
      car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
      // Steering grows with speed only up to a point, then stays flat: at
      // full speed a sharper turn would throw the car into the buildings
      // on the corner instead of around the intersection.
      if (Math.abs(car.speed) > 4) {
        const steerAuthority = Math.min(1, Math.abs(car.speed) / 220);
        car.angle += steer * CAR.steer * dt * steerAuthority * (car.speed >= 0 ? 1 : -1);
      }
      const nx = car.x + Math.cos(car.angle) * car.speed * dt;
      const ny = car.y + Math.sin(car.angle) * car.speed * dt;
      car.x = clamp(nx, 40, WORLD.width - 40);
      car.y = clamp(ny, 40, WORLD.height - 40);
      if (pushOutOfBuildings(car, 24)) { car.speed *= 0.7; events |= EVENT_HIT; }
      p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
      // Running over a pedestrian is a crime, and it hurts.
      for (const ped of state.peds) {
        if (Math.abs(car.speed) > 120 && dist2(car.x, car.y, ped.x, ped.y) < 900) {
          ped.flee = 3;
          addWanted(WANTED.hitPedestrian);
          events |= EVENT_CRIME;
        }
      }
    } else {
      const mx = input.moveX();
      const my = input.moveY();
      const len = Math.hypot(mx, my) || 1;
      const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      if (mx !== 0 || my !== 0) {
        p.angle = Math.atan2(my / len, mx / len);
        p.x = clamp(p.x + (mx / len) * speed * dt, 20, WORLD.width - 20);
        p.y = clamp(p.y + (my / len) * speed * dt, 20, WORLD.height - 20);
        pushOutOfBuildings(p, PLAYER.radius);
      }
      p.speed = mx !== 0 || my !== 0 ? speed : 0;
    }

    // Pickups.
    for (const pickup of state.pickups) {
      if (pickup.taken) continue;
      if (dist2(p.x, p.y, pickup.x, pickup.y) < 1600) {
        pickup.taken = true;
        if (pickup.kind === 'cash') { p.cash += pickup.amount; state.score += pickup.amount; }
        if (pickup.kind === 'ammo') p.ammo = Math.min(PLAYER.maxAmmo, p.ammo + pickup.amount);
        if (pickup.kind === 'health') p.health = Math.min(PLAYER.health, p.health + pickup.amount);
        events |= EVENT_PICKUP;
      }
    }

    // Rivals fight back on foot.
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      const dx = p.x - rival.x; const dy = p.y - rival.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 300) {
        rival.angle = Math.atan2(dy, dx);
        rival.x += (dx / d) * rival.speed * dt;
        rival.y += (dy / d) * rival.speed * dt;
        rival.shootTimer -= dt;
        if (d < 260 && rival.shootTimer <= 0) {
          rival.shootTimer = 1.4;
          if (p.invuln <= 0) { p.health -= 8; p.invuln = 0.5; events |= EVENT_HIT; addParticle(p.x, p.y, '#e5534b', 5); }
        }
      }
    }

    updateTraffic(state, dt, random);
    const policeEvents = updatePolice(state, dt, random, { addWanted, addParticle });
    events |= policeEvents;

    // Wanted decay: hide long enough and the heat cools off.
    if (state.wanted > 0) {
      state.wantedTimer += dt;
      if (state.crimeTimer > 8 && state.wantedTimer > WANTED.decaySeconds && state.police.length === 0) {
        state.wanted -= 1;
        state.wantedTimer = 0;
      }
    }

    // Missions.
    const missionEvents = missions.update(state, dt, { spawnRival, addParticle, addWanted });
    events |= missionEvents;
    if (missionEvents & EVENT_MISSION) {
      const reward = MISSION_REWARDS[state.missionIndex - 1] || 0;
      p.cash += reward;
      state.score += reward;
    }

    // Particles fade.
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const part = state.particles[i];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      if (part.life <= 0) state.particles.splice(i, 1);
    }

    // Camera follows the player, clamped to the world.
    state.camera.x = clamp(p.x - 640, 0, WORLD.width - 1280);
    state.camera.y = clamp(p.y - 360, 0, WORLD.height - 720);

    if (p.health <= 0 && !state.over) {
      state.over = true; state.overReason = 'You were taken down.';
      events |= EVENT_OVER;
    }
    if (state.busted && !state.over) {
      state.over = true; state.overReason = 'Busted by the Solara Bay police.';
      events |= EVENT_OVER | EVENT_BUSTED;
    }
    return events;
  }

  reset();
  return {
    state, reset, step, enterCar, exitCar, punch, shoot,
    addWanted, addParticle, spawnRival, spawnCar, spawnTrafficCar,
    buildings, parks, missions,
  };
}
