// Solara Bay v2 3D — seeded random (xorshift32), rewritten in the rebuild.
// Rebuild pass 2: re-verified that the same seed replays the same city.
// One seed replays the same city, traffic and screenshot scenes, which
// keeps the staged shots exact and the 3D city layout deterministic.
// pick() is guarded against an empty list: a single undefined color or
// name would break the whole city build.
export function createRandom(seed) {
  let state = (seed | 0) || 1;
  return function random() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

export function pick(random, list) {
  if (!list.length) return undefined;
  return list[Math.floor(random() * list.length)];
}

export function range(random, low, high) {
  return low + random() * (high - low);
}

export function rangeInt(random, low, high) {
  return low + Math.floor(random() * (high - low + 1));
}

// Deterministic shuffle: the 3D city shuffles its building palette and
// palm placement with this, so two seeds give two different skylines.
export function shuffle(random, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}
