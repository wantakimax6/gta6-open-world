// Solara Bay story: five missions for Mara Voss and the Harbor Crew.
// Each mission has a target, a short brief, and a completion rule. The
// world calls update() every step; it returns EVENT_MISSION (8) when one
// is finished, and the world pays its reward.
import { CITY } from './config.js';
import { EVENT_MISSION } from './world.js';

const MISSION_DEFS = [
  {
    title: '1. Sunrise Courier',
    brief: 'Pick up the package at Harbor Market.',
    target: () => ({ x: CITY.market.x, y: CITY.market.y, label: CITY.market.label }),
    radius: 90,
  },
  {
    title: '2. The Drop',
    brief: 'Deliver it to Solara Pier. Stay out of trouble.',
    target: () => ({ x: CITY.pier.x, y: CITY.pier.y, label: CITY.pier.label }),
    radius: 90,
  },
  {
    title: '3. Borrowed Wheels',
    brief: 'Steal the orange sports car by the Garage and bring it home.',
    target: () => ({ x: CITY.garage.x, y: CITY.garage.y, label: CITY.garage.label }),
    radius: 110,
    needsCar: true,
  },
  {
    title: '4. Heat on the Strip',
    brief: 'The police are on you. Lose them, then reach the Hideout.',
    target: () => ({ x: CITY.hideout.x, y: CITY.hideout.y, label: CITY.hideout.label }),
    radius: 110,
    wantedAtStart: 3,
    surviveSeconds: 20,
  },
  {
    title: '5. The Bay Heist',
    brief: 'Hold the Bay Bank for 10 seconds, then escape to the Hideout.',
    target: () => ({ x: CITY.bank.x, y: CITY.bank.y, label: CITY.bank.label }),
    radius: 120,
    holdSeconds: 10,
    wantedAtStart: 4,
    thenTarget: () => ({ x: CITY.hideout.x, y: CITY.hideout.y, label: CITY.hideout.label }),
  },
];

export function createMissions() {
  function current(index) {
    if (index >= MISSION_DEFS.length) return null;
    const def = MISSION_DEFS[index];
    return { index, title: def.title, brief: def.brief, target: def.target(), def };
  }

  function update(state, dt, helpers) {
    const mission = state.mission;
    if (!mission) return 0;
    const def = mission.def;
    const p = state.player;
    state.missionTimer += dt;

    // Mission 4 starts with heat; mission 5 starts with a hold at the bank.
    if (def.wantedAtStart && !mission.started) {
      mission.started = true;
      if (def.wantedAtStart === 3) {
        helpers.addWanted(3);
        helpers.spawnRival(1500, 900);
        helpers.spawnRival(1700, 1100);
      }
      if (def.wantedAtStart === 4) {
        helpers.addWanted(2);
        helpers.spawnRival(CITY.bank.x - 80, CITY.bank.y);
        helpers.spawnRival(CITY.bank.x + 80, CITY.bank.y + 60);
        helpers.spawnRival(CITY.bank.x, CITY.bank.y - 80);
      }
    }

    // Mission 5, second leg: after the hold, the target moves to the hideout.
    if (def.thenTarget && mission.held) {
      mission.target = def.thenTarget();
    }

    const target = mission.target;
    const dx = p.x - target.x;
    const dy = p.y - target.y;
    const distance = Math.hypot(dx, dy);

    // Mission 3 needs the player in a car to count.
    if (def.needsCar && !p.inCar) return 0;

    // Mission 4 needs the player to survive its timer before the hideout counts.
    if (def.surviveSeconds && state.missionTimer < def.surviveSeconds) return 0;

    if (distance < def.radius) {
      if (def.holdSeconds) {
        state.missionHold += dt;
        if (state.missionHold < def.holdSeconds) return 0;
        mission.held = true;
        if (def.thenTarget) {
          state.missionHold = 0;
          mission.target = def.thenTarget();
          helpers.addWanted(2);
          return 0;
        }
      }
      // Mission complete: advance, pay the reward in the world step.
      state.missionIndex += 1;
      state.mission = current(state.missionIndex);
      state.missionTimer = 0;
      state.missionHold = 0;
      helpers.addParticle(p.x, p.y, '#f2c94c', 20);
      return EVENT_MISSION;
    }
    return 0;
  }

  return { current, update, count: MISSION_DEFS.length };
}
