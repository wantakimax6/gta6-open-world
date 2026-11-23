// Solara Bay v2 3D HUD: DOM overlay (cash, health, ammo, wanted stars,
// mission, speed, time of day, FPS, quality buttons, red alert banner)
// plus a 2D canvas minimap of the whole city (buildings, mission target,
// traffic, police, rivals, player). DOM text is updated only when it
// changes, so the HUD costs nothing on frames where nothing changed.
import { WORLD } from './config.js';

const MINIMAP = { size: 168, margin: 16 };

export function createHud(elements, callbacks) {
  const { cashEl, healthFill, healthText, ammoEl, starsEl, missionEl, holdEl, alertEl, speedEl, timeEl, fpsEl, minimap } = elements;
  const ctx = minimap.getContext('2d');
  minimap.width = MINIMAP.size;
  minimap.height = MINIMAP.size;
  let lastText = '';
  let lastStars = -1;

  function starRow(wanted) {
    let s = '';
    for (let i = 0; i < 5; i += 1) s += i < wanted ? '★' : '☆';
    return s;
  }

  function timeLabel(timeOfDay) {
    if (timeOfDay < 0.2) return 'Dawn';
    if (timeOfDay < 0.45) return 'Day';
    if (timeOfDay < 0.62) return 'Sunset';
    return 'Night';
  }

  function drawMinimap(state) {
    const size = MINIMAP.size;
    const scale = size / WORLD.width;
    const p = state.player;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(8, 12, 18, 0.78)';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(0, size - 12, size, 12);
    ctx.fillStyle = '#3a3f4a';
    for (let gx = 200; gx <= 3000; gx += 400) {
      ctx.fillRect(gx * scale - 1.5, 0, 3, size);
      ctx.fillRect(0, gx * scale - 1.5, size, 3);
    }
    ctx.fillStyle = '#c9a44a';
    for (const b of state.buildings) {
      ctx.fillRect(b.x * scale, b.y * scale, Math.max(1, b.w * scale), Math.max(1, b.h * scale));
    }
    if (state.mission) {
      ctx.fillStyle = '#f2c94c';
      ctx.beginPath();
      ctx.arc(state.mission.target.x * scale, state.mission.target.y * scale, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#4a7fc9';
    for (const car of state.cars) ctx.fillRect(car.x * scale - 2, car.y * scale - 2, 4, 4);
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#eef1f5';
    for (const cruiser of state.police) {
      ctx.beginPath();
      ctx.arc(cruiser.x * scale, cruiser.y * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    // Rivals (orange) so the hunt in mission 8 reads on the map: the
    // player can see the pack closing in before it arrives.
    ctx.fillStyle = '#ff8c42';
    for (const rival of state.rivals) {
      if (!rival.alive) continue;
      ctx.beginPath();
      ctx.arc(rival.x * scale, rival.y * scale, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e5534b';
    ctx.beginPath();
    ctx.arc(p.x * scale, p.y * scale, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }

  function update(state, screen, fps, quality) {
    const p = state.player;
    const text = `${p.cash}|${Math.round(p.health)}|${p.ammo}|${state.wanted}|${state.mission ? state.mission.title : 'done'}|${Math.round(p.speed)}|${timeLabel(state.timeOfDay)}|${fps}|${quality}`;
    if (text !== lastText) {
      lastText = text;
      cashEl.textContent = `$${p.cash}`;
      healthFill.style.width = `${Math.max(0, p.health)}%`;
      // Low health turns the bar red so the danger reads at a glance.
      healthFill.style.background = p.health < 30
        ? 'linear-gradient(90deg, #e5534b, #ff3b30)'
        : 'linear-gradient(90deg, #4ac9a0, #7cff4a)';
      healthText.textContent = `Health ${Math.max(0, Math.round(p.health))}`;
      ammoEl.textContent = `Ammo ${p.ammo}`;
      missionEl.textContent = state.mission
        ? `${state.mission.title} — ${state.mission.brief}`
        : 'Story complete — Solara Bay is yours, Mara!';
      const speed = p.inCar ? Math.abs(Math.round(p.speed * 0.12)) : Math.round(p.speed * 0.12);
      speedEl.textContent = p.inCar ? `${speed} km/h — in car` : 'On foot';
      timeEl.textContent = `${timeLabel(state.timeOfDay)} · ${fps} FPS · ${quality}`;
      fpsEl.textContent = `${fps} FPS`;
      if (state.mission && state.mission.def.holdSeconds && state.missionHold > 0) {
        holdEl.style.display = 'block';
        holdEl.style.width = `${200 * Math.min(1, state.missionHold / state.mission.def.holdSeconds)}px`;
      } else {
        holdEl.style.display = 'none';
      }
    }
    if (state.wanted !== lastStars) {
      lastStars = state.wanted;
      starsEl.textContent = starRow(state.wanted);
      starsEl.classList.toggle('hot', state.wanted >= 3);
    }
    // Alert banner (mission 8's snitch leaks): shown while its timer runs.
    if (state.alertTimer > 0 && state.alert) {
      alertEl.textContent = state.alert;
      alertEl.style.display = 'block';
    } else {
      alertEl.style.display = 'none';
    }
    drawMinimap(state);
  }

  return { update, callbacks };
}
