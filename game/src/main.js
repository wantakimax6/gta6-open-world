// Solara Bay boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there.
// The game moves between title, play, paused and game-over screens.
//
// ?seed=N fixes the city. ?shot=start|drive|chase|mission (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BUSTED, EVENT_COIN, EVENT_HIT, EVENT_MISSION, EVENT_OVER, EVENT_PICKUP } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_PAUSE, ACTION_PUNCH, ACTION_SHOOT, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261123;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave() {
  try {
    const p = world.state.player;
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: p.cash, missionIndex: world.state.missionIndex, score: world.state.score,
      savedAt: new Date().toISOString(),
    }));
  } catch { /* storage can be off: the save then lasts this visit only */ }
}

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); }
  catch { /* best score then lasts this visit only */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  const saved = readSave();
  if (saved && typeof saved.missionIndex === 'number' && saved.missionIndex > 0) {
    world.state.missionIndex = Math.min(saved.missionIndex, 4);
    world.state.mission = world.missions.current(world.state.missionIndex);
    world.state.player.cash = saved.cash || 0;
  }

  function announce(message) { status.textContent = message; }

  function startGame() {
    world.reset();
    // Keep a loaded save's mission and cash when starting from the title.
    if (saved && typeof saved.missionIndex === 'number' && saved.missionIndex > 0) {
      world.state.missionIndex = Math.min(saved.missionIndex, 4);
      world.state.mission = world.missions.current(world.state.missionIndex);
      world.state.player.cash = saved.cash || 0;
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Playing Solara Bay. Drive with WASD, enter a car with E.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.player.cash > best) { best = world.state.player.cash; saveBest(best); }
    writeSave();
    audio.busted();
    announce(`Game over. Cash $${world.state.player.cash}. Best $${best}.`);
  }

  // Actions are taken once per frame and shared: handleActions reads the
  // confirm/pause flags, step reads enter/punch/shoot, so no press is lost.
  function handleActions(actions) {
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
    else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
  }

  function step(actions) {
    const mapped = {
      enter: Boolean(actions & ACTION_ENTER),
      punch: Boolean(actions & ACTION_PUNCH),
      shoot: Boolean(actions & ACTION_SHOOT),
    };
    if (screen === SCREEN_TITLE) return;
    const events = world.step(STEP, input, mapped);
    if (events & EVENT_COIN) audio.coin();
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_HIT) audio.crash();
    if (events & EVENT_MISSION) { audio.missionDone(); writeSave(); announce(`Mission complete! Next: ${world.state.mission ? world.state.mission.title : 'story complete'}`); }
    if (events & EVENT_BUSTED) audio.busted();
    if (events & EVENT_OVER) endGame();
    audio.engine(Math.abs(world.state.player.speed) / 560, world.state.player.inCar);
    audio.sirenTick(STEP, world.state.wanted);
    audio.music(STEP, screen === SCREEN_PLAY);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let firstStep = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Solara Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
