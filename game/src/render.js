// Drawing only for Solara Bay: the city, cars, people, particles and the
// title, pause and game-over screens. The camera follows the player; the
// canvas is the full window, 1280 by 720 in the screenshots.
import { CITY, COLORS, WORLD } from './config.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW = { width: 1280, height: 720 };

function drawCar(ctx, x, y, angle, color, isPolice) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-28, -14, 56, 28);
  ctx.fillStyle = color;
  ctx.fillRect(-27, -13, 54, 26);
  ctx.fillStyle = '#9fd8ff';
  ctx.fillRect(-8, -11, 16, 22);
  ctx.fillStyle = '#111';
  ctx.fillRect(-20, -14, 8, 5);
  ctx.fillRect(-20, 9, 8, 5);
  ctx.fillRect(12, -14, 8, 5);
  ctx.fillRect(12, 9, 8, 5);
  if (isPolice) {
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-4, -13, 8, 6);
    ctx.fillStyle = '#4a7fc9';
    ctx.fillRect(-4, 7, 8, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLICE', 0, 4);
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawPerson(ctx, x, y, angle, color, isPlayer) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.arc(2, 3, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = isPlayer ? '#e5534b' : color;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath();
  ctx.arc(4, 0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { width: VIEW.width, height: VIEW.height, scale: 1, x: 0, y: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.width = window.innerWidth;
    view.height = window.innerHeight;
    view.scale = ratio;
  }

  function text(value, x, y, size, color, align, bold) {
    ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawWorld(state) {
    const cam = state.camera;
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    // Ground: grass, then the beach and the sea along the south edge.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(cam.x - 20, cam.y - 20, view.width + 40, view.height + 40);
    ctx.fillStyle = COLORS.sand;
    ctx.fillRect(0, 2240, WORLD.width, 160);
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(0, 2330, WORLD.width, 70);
    ctx.fillStyle = '#7fb8dd';
    for (let x = 0; x < WORLD.width; x += 180) ctx.fillRect(x + ((state.elapsed * 20) % 180), 2340, 60, 4);
    // Parks.
    ctx.fillStyle = COLORS.park;
    for (const park of state.parks) ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = '#3d7a33';
    for (const park of state.parks) {
      ctx.beginPath(); ctx.arc(park.x + park.w / 3, park.y + park.h / 3, 14, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(park.x + (park.w * 2) / 3, park.y + (park.h * 2) / 3, 18, 0, Math.PI * 2); ctx.fill();
    }
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (let c = 200; c <= 3000; c += 400) {
      ctx.fillRect(c - WORLD.roadWidth / 2, 0, WORLD.roadWidth, WORLD.height);
      ctx.fillRect(0, c - WORLD.roadWidth / 2, WORLD.width, WORLD.roadWidth);
    }
    ctx.fillStyle = COLORS.roadLine;
    for (let c = 200; c <= 3000; c += 400) {
      for (let d = 0; d < WORLD.width; d += 80) {
        ctx.fillRect(d, c - 2, 36, 4);
        ctx.fillRect(c - 2, d, 4, 36);
      }
    }
    // Buildings with roofs and windows.
    for (const b of state.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (let wx = b.x + 14; wx < b.x + b.w - 14; wx += 34) {
        for (let wy = b.y + 14; wy < b.y + b.h - 14; wy += 34) ctx.fillRect(wx, wy, 12, 10);
      }
    }
    // Mission target marker: a pulsing gold ring.
    if (state.mission) {
      const t = state.mission.target;
      const pulse = 26 + Math.sin(state.elapsed * 4) * 6;
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath(); ctx.arc(t.x, t.y, 8, 0, Math.PI * 2); ctx.fill();
      text(t.label, t.x, t.y - pulse - 10, 16, '#fff', 'center', true);
    }
    // Pickups.
    for (const pickup of state.pickups) {
      if (pickup.taken) continue;
      ctx.fillStyle = pickup.kind === 'cash' ? '#f2c94c' : pickup.kind === 'ammo' ? '#e8e8e8' : '#4ac9a0';
      ctx.beginPath(); ctx.arc(pickup.x, pickup.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(pickup.kind === 'cash' ? '$' : pickup.kind === 'ammo' ? 'A' : '+', pickup.x, pickup.y + 4);
    }
    // Traffic and parked cars.
    for (const car of state.cars) drawCar(ctx, car.x, car.y, car.angle, car.color, false);
    // Police cruisers, with flashing lights.
    for (const cruiser of state.police) {
      drawCar(ctx, cruiser.x, cruiser.y, cruiser.angle, '#1a1a2e', true);
      const flash = Math.floor(state.elapsed * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff3b30' : '#3b82ff';
      ctx.beginPath(); ctx.arc(cruiser.x, cruiser.y - 18, 5, 0, Math.PI * 2); ctx.fill();
    }
    // Pedestrians and rivals.
    for (const ped of state.peds) drawPerson(ctx, ped.x, ped.y, ped.angle, ped.color, false);
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      drawPerson(ctx, rival.x, rival.y, rival.angle, '#7a1f1f', false);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(rival.x - 14, rival.y - 26, 28 * Math.max(0, rival.health / 40), 4);
    }
    // The player, on foot or in the car (the car is drawn above already).
    const p = state.player;
    if (!p.inCar) {
      if (p.invuln <= 0 || Math.floor(p.invuln * 10) % 2 === 1) drawPerson(ctx, p.x, p.y, p.angle, '#e5534b', true);
    }
    // Particles.
    for (const part of state.particles) {
      ctx.globalAlpha = Math.max(0, part.life * 2);
      ctx.fillStyle = part.color;
      ctx.fillRect(part.x - 3, part.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPanel(title, lines, prompt) {
    const w = Math.min(620, view.width - 40);
    const h = 150 + lines.length * 32;
    const x = (view.width - w) / 2;
    const y = (view.height - h) / 2;
    ctx.fillStyle = 'rgba(10, 14, 20, 0.88)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#f2c94c';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    text(title, view.width / 2, y + 62, 42, '#f2c94c', 'center', true);
    for (let i = 0; i < lines.length; i += 1) text(lines[i], view.width / 2, y + 108 + i * 32, 17, '#eef1f5', 'center');
    text(prompt, view.width / 2, y + h - 28, 18, '#4ac9a0', 'center', true);
  }

  function draw(state, screen, best) {
    ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, view.width, view.height);
    drawWorld(state);
    if (screen === SCREEN_TITLE) {
      drawPanel(CITY.name, [
        `Mara Voss has come home to ${CITY.name}.`,
        'Drive, steal cars, run missions for the Harbor Crew —',
        'and stay one step ahead of the police.',
        'WASD drive / walk · E enter car · F shoot · J punch · P pause',
        best > 0 ? `Best cash: $${best}` : 'A brand-new open world, made for this bounty.',
      ], 'Press Space or click to start');
      return;
    }
    drawHud(ctx, state, view);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The city waits for you.', 'Your progress is saved when a mission ends.'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('Game over', [state.overReason || 'Your run in Solara Bay ends here.', `Cash earned: $${state.player.cash}   Score: ${state.score}`], 'Press Space to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, view };
}
