// Traffic cars and pedestrians for Solara Bay.
// Traffic drives along the road grid, turns at intersections, and slows
// for the car ahead. Pedestrians stroll on the sidewalks and flee danger.
import { WORLD } from './config.js';

const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];

function nearestCenter(value) {
  let best = ROAD_CENTERS[0];
  for (const c of ROAD_CENTERS) if (Math.abs(value - c) < Math.abs(value - best)) best = c;
  return best;
}

export function updateTraffic(state, dt, random) {
  // Cars: follow their road axis, pick a new direction at intersections.
  for (const car of state.cars) {
    if (car.kind !== 'traffic') continue;
    // Slow for a car ahead on the same lane.
    let ahead = false;
    for (const other of state.cars) {
      // Traffic slows for the player's car too, instead of driving through it.
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      if (car.axis === 'x' && Math.abs(dy) < 40 && dx * car.dir > 0 && dx * car.dir < 90) ahead = true;
      if (car.axis === 'y' && Math.abs(dx) < 40 && dy * car.dir > 0 && dy * car.dir < 90) ahead = true;
    }
    const targetSpeed = ahead ? 0 : car.cruise;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
    if (car.axis === 'x') {
      car.x += car.dir * car.speed * dt;
      car.y += (nearestCenter(car.y) + (car.dir > 0 ? -22 : 22) - car.y) * Math.min(1, dt * 2);
      car.angle = car.dir > 0 ? 0 : Math.PI;
    } else {
      car.y += car.dir * car.speed * dt;
      car.x += (nearestCenter(car.x) + (car.dir > 0 ? 22 : -22) - car.x) * Math.min(1, dt * 2);
      car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    // At an intersection, sometimes turn onto the cross road.
    const nearX = Math.abs(car.x - nearestCenter(car.x)) < 12;
    const nearY = Math.abs(car.y - nearestCenter(car.y)) < 12;
    if (nearX && nearY && random() < dt * 0.25) {
      if (car.axis === 'x') {
        car.axis = 'y';
        car.dir = random() < 0.5 ? 1 : -1;
      } else {
        car.axis = 'x';
        car.dir = random() < 0.5 ? 1 : -1;
      }
    }
    // Wrap around the far edge so traffic never runs out.
    if (car.x < 60) { car.x = 60; car.dir = 1; }
    if (car.x > WORLD.width - 60) { car.x = WORLD.width - 60; car.dir = -1; }
    if (car.y < 60) { car.y = 60; car.dir = 1; }
    if (car.y > WORLD.height - 60) { car.y = WORLD.height - 60; car.dir = -1; }
  }

  // Pedestrians: wander, keep to sidewalks, flee a speeding car or a shot.
  for (const ped of state.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - state.player.x;
      const dy = ped.y - state.player.y;
      const d = Math.hypot(dx, dy) || 1;
      ped.x += (dx / d) * 150 * dt;
      ped.y += (dy / d) * 150 * dt;
      ped.angle = Math.atan2(dy, dx);
      continue;
    }
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (ped.x < 80 || ped.x > WORLD.width - 80 || ped.y < 80 || ped.y > WORLD.height - 80) ped.angle += Math.PI;
    if (random() < dt * 0.2) ped.angle += (random() - 0.5) * 1.6;
    ped.x = Math.max(40, Math.min(WORLD.width - 40, ped.x));
    ped.y = Math.max(40, Math.min(WORLD.height - 40, ped.y));
  }
}
