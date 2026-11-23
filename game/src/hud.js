// Solara Bay HUD: cash, health, wanted stars, mission objective, speed,
// and the minimap. Drawn in screen space, after the world is painted.
import { WORLD } from './config.js';

const MINIMAP = { size: 168, margin: 16 };

function star(ctx, x, y, size, filled) {
  ctx.fillStyle = filled ? '#ffd23f' : '#3a3f4a';
  ctx.strokeStyle = '#111';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    const angle2 = angle + Math.PI / 5;
    const px = x + Math.cos(angle) * size;
    const py = y + Math.sin(angle) * size;
    const qx = x + Math.cos(angle2) * size * 0.45;
    const qy = y + Math.sin(angle2) * size * 0.45;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    ctx.lineTo(qx, qy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawHud(ctx, state, view) {
  const p = state.player;
  const w = view.width;
  const h = view.height;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  // Cash and health, top left.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.65)';
  ctx.fillRect(12, 12, 220, 64);
  ctx.fillStyle = '#f2c94c';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText(`$${p.cash}`, 24, 20);
  ctx.fillStyle = '#e5534b';
  ctx.fillRect(24, 52, 130, 12);
  ctx.fillStyle = '#4ac9a0';
  ctx.fillRect(24, 52, Math.max(0, 130 * p.health / 100), 12);
  ctx.fillStyle = '#eef1f5';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Health ${Math.max(0, Math.round(p.health))}  Ammo ${p.ammo}`, 162, 50);

  // Wanted stars, top right.
  for (let i = 0; i < 5; i += 1) star(ctx, w - 28 - i * 30, 30, 13, i < state.wanted);

  // Mission objective, top centre.
  if (state.mission) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.65)';
    const label = `${state.mission.title} — ${state.mission.brief}`;
    ctx.font = 'bold 15px system-ui, sans-serif';
    const textWidth = ctx.measureText(label).width;
    ctx.fillRect((w - textWidth) / 2 - 12, 12, textWidth + 24, 30);
    ctx.fillStyle = '#eef1f5';
    ctx.textAlign = 'center';
    ctx.fillText(label, w / 2, 19);
    ctx.textAlign = 'left';
    // Hold progress for the bank heist.
    if (state.mission.def.holdSeconds && state.missionHold > 0) {
      ctx.fillStyle = '#e8d44d';
      ctx.fillRect(w / 2 - 100, 48, 200 * Math.min(1, state.missionHold / state.mission.def.holdSeconds), 8);
    }
  } else {
    ctx.fillStyle = '#f2c94c';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Story complete — Solara Bay is yours, Mara!', w / 2, 20);
    ctx.textAlign = 'left';
  }

  // Speed and mode, bottom left.
  ctx.fillStyle = 'rgba(10, 14, 20, 0.65)';
  ctx.fillRect(12, h - 56, 210, 44);
  ctx.fillStyle = '#eef1f5';
  ctx.font = 'bold 20px system-ui, sans-serif';
  const speed = p.inCar ? Math.abs(Math.round(p.speed * 0.12)) : Math.round(p.speed * 0.12);
  ctx.fillText(p.inCar ? `${speed} km/h  — in car` : 'On foot', 24, h - 48);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = '#8b93a3';
  ctx.fillText('WASD move/drive · E enter car · F shoot · J punch · P pause', 24, h - 24);

  // Minimap, bottom right: the whole city, player, cars, police, target.
  const size = MINIMAP.size;
  const mx = w - size - MINIMAP.margin;
  const my = h - size - MINIMAP.margin;
  const scale = size / WORLD.width;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.7)';
  ctx.fillRect(mx - 4, my - 4, size + 8, size + 8);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(mx, my + size - 14, size, 14);
  ctx.fillStyle = '#3a3f4a';
  for (let gx = 200; gx <= 3000; gx += 400) {
    ctx.fillRect(mx + gx * scale - 2, my, 4, size);
    ctx.fillRect(mx, my + gx * scale - 2, size, 4);
  }
  ctx.fillStyle = '#c9a44a';
  for (const b of state.buildings) ctx.fillRect(mx + b.x * scale, my + b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
  if (state.mission) {
    ctx.fillStyle = '#f2c94c';
    ctx.beginPath();
    ctx.arc(mx + state.mission.target.x * scale, my + state.mission.target.y * scale, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#4a7fc9';
  for (const car of state.cars) ctx.fillRect(mx + car.x * scale - 2, my + car.y * scale - 2, 4, 4);
  ctx.fillStyle = '#1a1a2e';
  ctx.strokeStyle = '#eef1f5';
  for (const cruiser of state.police) {
    ctx.beginPath();
    ctx.arc(mx + cruiser.x * scale, my + cruiser.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#e5534b';
  ctx.beginPath();
  ctx.arc(mx + p.x * scale, my + p.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}
