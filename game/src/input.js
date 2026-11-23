// Solara Bay v2 3D input: keyboard, mouse orbit and touch.
// Held keys are read every frame; one-shot presses (start, pause, enter
// car, punch, shoot, jump) are queued as flags and taken once, so a press
// between frames is never lost and never counted twice. Dragging with the
// mouse orbits the third-person camera; the orbit delta is exposed so the
// renderer can turn the camera without pointer lock (which headless
// browsers and the screenshot runs cannot grant). Losing the window
// clears every held key and any half-finished orbit drag, so the game
// never keeps driving or spinning on its own after an alt-tab.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_MISSION = 32;
export const ACTION_JUMP = 64;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyJ']);
const SHOOT = new Set(['KeyF', 'KeyK']);
const MISSION = new Set(['KeyM']);

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false, run: false };
  let actions = 0;
  let orbitDX = 0;
  let orbitDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let mouseDown = false;

  function press(code, event) {
    if (UP.has(code)) held.up = true;
    else if (DOWN.has(code)) held.down = true;
    else if (LEFT.has(code)) held.left = true;
    else if (RIGHT.has(code)) held.right = true;
    else if (RUN.has(code)) held.run = true;
    else if (CONFIRM.has(code)) { if (!event.repeat) actions |= ACTION_CONFIRM; }
    else if (PAUSE.has(code)) { if (!event.repeat) actions |= ACTION_PAUSE; }
    else if (ENTER.has(code)) { if (!event.repeat) actions |= ACTION_ENTER; }
    else if (PUNCH.has(code)) { if (!event.repeat) actions |= ACTION_PUNCH; }
    else if (SHOOT.has(code)) { if (!event.repeat) actions |= ACTION_SHOOT; }
    else if (MISSION.has(code)) { if (!event.repeat) actions |= ACTION_MISSION; }
    else return false;
    return true;
  }

  function release(code) {
    if (UP.has(code)) held.up = false;
    else if (DOWN.has(code)) held.down = false;
    else if (LEFT.has(code)) held.left = false;
    else if (RIGHT.has(code)) held.right = false;
    else if (RUN.has(code)) held.run = false;
  }

  window.addEventListener('keydown', (event) => {
    if (press(event.code, event)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => release(event.code));
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.run = false;
    mouseDown = false;
    dragging = false;
    // Drop any half-finished orbit drag, or the camera keeps turning
    // after the window comes back.
    orbitDX = 0;
    orbitDY = 0;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());
  target.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => { mouseDown = false; dragging = false; });
  target.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    orbitDX += event.clientX - lastX;
    orbitDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });

  return {
    held,
    mouse() { return { x: lastX, y: lastY, down: mouseDown }; },
    takeOrbit() {
      const d = { dx: orbitDX, dy: orbitDY };
      orbitDX = 0;
      orbitDY = 0;
      return d;
    },
    steer() { return (held.right ? 1 : 0) - (held.left ? 1 : 0); },
    throttle() { return (held.up ? 1 : 0) - (held.down ? 1 : 0); },
    moveX() { return (held.right ? 1 : 0) - (held.left ? 1 : 0); },
    moveY() { return (held.down ? 1 : 0) - (held.up ? 1 : 0); },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
