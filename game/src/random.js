// A tiny seeded random source (xorshift32): the same seed replays the same
// city, traffic and screenshot scenes, which keeps the staged shots exact.
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
  return list[Math.floor(random() * list.length)];
}

export function range(random, low, high) {
  return low + random() * (high - low);
}
