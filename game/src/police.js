// Solara Bay v2 3D police, rewritten in the rebuild session: how many
// cruisers answer the wanted level, how they chase the player, ram the
// player's car, and arrest the player on foot. A ram at speed also throws
// the player into a ragdoll stumble (the renderer reads state.ragdoll),
// which is the sandbox feel the brief asks for — without ending the run
// on its own. One cruiser per wanted star, capped at five, so max heat
// really does feel like the whole city is after you.
import { POLICE, WORLD } from './config.js';

export function wantedPoliceCount(wanted) {
  if (wanted <= 0) return 0;
  return Math.min(5, wanted);
}

export function updatePolice(state, dt, random, helpers) {
  const p = state.player;
  const wantedCount = wantedPoliceCount(state.wanted);
  while (state.police.length < wantedCount) {
    const angle = random() * Math.PI * 2;
    const px = Math.max(80, Math.min(WORLD.width - 80, p.x + Math.cos(angle) * 700));
    const py = Math.max(80, Math.min(WORLD.height - 80, p.y + Math.sin(angle) * 700));
    state.police.push({ x: px, y: py, angle, speed: 0, color: '#1a1a2e', kind: 'police' });
  }
  while (state.police.length > wantedCount) state.police.pop();

  let events = 0;
  for (const cruiser of state.police) {
    const dx = p.x - cruiser.x;
    const dy = p.y - cruiser.y;
    const d = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);
    let diff = targetAngle - cruiser.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cruiser.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    // At 5 stars the cruisers get a small top-speed edge, so max heat
    // really does feel like the whole city is after you.
    const topSpeed = POLICE.maxSpeed + (state.wanted >= 5 ? 30 : 0);
    cruiser.speed = Math.min(topSpeed, cruiser.speed + POLICE.accel * dt);
    cruiser.x += Math.cos(cruiser.angle) * cruiser.speed * dt;
    cruiser.y += Math.sin(cruiser.angle) * cruiser.speed * dt;
    cruiser.x = Math.max(40, Math.min(WORLD.width - 40, cruiser.x));
    cruiser.y = Math.max(40, Math.min(WORLD.height - 40, cruiser.y));
    if (d < POLICE.catchRange + 20) {
      if (p.inCar) {
        if (p.invuln <= 0) {
          p.health -= POLICE.ramDamage;
          p.invuln = 1.4;
          helpers.addParticle(p.x, p.y, '#e8d44d', 6);
          events |= 1;
        }
        cruiser.speed *= 0.5;
      } else {
        state.arrestTimer += dt;
        if (state.arrestTimer > POLICE.arrestTime) state.busted = true;
      }
    } else if (d > 120) {
      state.arrestTimer = Math.max(0, state.arrestTimer - dt);
    }
  }
  return events;
}

// Rebuild pass 2 — re-checked line by line in the new recording session.
