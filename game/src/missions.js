// Solara Bay v2 3D story: eight missions for Mara Voss and the Harbor Crew.
// Missions 1-5 are the v1 story, adapted to the 3D city; 6-7 are new:
// a timed neon taxi run and a sunset getaway with cash drops. Mission 8
// is the hunt: a snitch in the crew leaks Mara's position to the Viper
// gang, so a pack of hunters keeps closing in until she reaches safety.
// Final pass: the story is meant to be played through in one sitting,
// Epic Conquest style — fast, fun, and forgiving, not a grind.
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
  {
    title: '6. Neon Taxi',
    brief: 'A fare is waiting on the Neon Strip. Pick them up, then drop them at Sunset Beach — fast, the meter is running.',
    target: () => ({ x: CITY.strip.x, y: CITY.strip.y, label: CITY.strip.label }),
    radius: 100,
    needsCar: true,
    thenTarget: () => ({ x: CITY.beach.x, y: CITY.beach.y, label: CITY.beach.label }),
    timeLimit: 75,
  },
  {
    title: '7. Sunset Getaway',
    brief: 'Grab the three cash drops across the city, then reach the Hideout before the heat catches you.',
    target: () => ({ x: CITY.bank.x, y: CITY.bank.y, label: CITY.bank.label }),
    radius: 120,
    wantedAtStart: 2,
    thenTarget: () => ({ x: CITY.hideout.x, y: CITY.hideout.y, label: CITY.hideout.label }),
    drops: 3,
  },
  {
    title: '8. Rat in the Crew',
    brief: 'A snitch in the Harbor Crew sold your position to the Viper gang. They are hunting you in a pack — survive the hunt, then reach the Hideout.',
    target: () => ({ x: CITY.hideout.x, y: CITY.hideout.y, label: CITY.hideout.label }),
    radius: 110,
    wantedAtStart: 3,
    surviveSeconds: 25,
    hunt: true,
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
    // Once the run is over (busted or dead), missions stop advancing.
    if (state.over) return 0;
    const def = mission.def;
    const p = state.player;
    state.missionTimer += dt;

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
      if (def.wantedAtStart === 2) {
        helpers.addWanted(2);
        helpers.spawnRival(CITY.bank.x - 100, CITY.bank.y + 40);
        helpers.spawnRival(CITY.beach.x + 60, CITY.beach.y - 60);
      }
    }

    // Mission 6/7 second leg: after the first target, the target moves.
    if (def.thenTarget && mission.held) {
      mission.target = def.thenTarget();
    }
    // Mission 7: cash drops are pickups the world spawns at mission start.
    if (def.drops && mission.started && !mission.dropsSpawned) {
      mission.dropsSpawned = true;
      helpers.spawnDrop(CITY.market.x + 120, CITY.market.y - 80);
      helpers.spawnDrop(CITY.strip.x - 100, CITY.strip.y + 100);
      helpers.spawnDrop(CITY.pier.x - 120, CITY.pier.y - 60);
    }

    // Mission 8, the hunt: a Viper pack closes in from the start, and the
    // snitch keeps leaking Mara's position — every 12 seconds a fresh
    // hunter spawns near her and the alert banner warns the player, so
    // the chase visibly tightens the longer she stays out in the open.
    if (def.hunt && !mission.huntStarted) {
      mission.huntStarted = true;
      mission.leakTimer = 0;
      helpers.spawnRival(p.x + 220, p.y - 160);
      helpers.spawnRival(p.x - 220, p.y + 160);
      helpers.setAlert('CEPU! Someone in the crew ratted you out — the Vipers are hunting you!');
    }
    if (def.hunt) {
      mission.leakTimer += dt;
      if (mission.leakTimer >= 12) {
        mission.leakTimer = 0;
        const alive = state.rivals.filter((r) => r.alive).length;
        if (alive < 6) {
          const a = state.elapsed;
          helpers.spawnRival(p.x + Math.cos(a) * 320, p.y + Math.sin(a) * 320);
        }
        helpers.setAlert('CEPU! Your position leaked — another Viper is closing in!');
        helpers.addParticle(p.x, p.y, '#e5534b', 14);
      }
    }

    const target = mission.target;
    const dx = p.x - target.x;
    const dy = p.y - target.y;
    const distance = Math.hypot(dx, dy);

    if (def.needsCar && !p.inCar) return 0;
    if (def.surviveSeconds && state.missionTimer < def.surviveSeconds) return 0;
    // Mission 6 is timed: running out of time fails the mission, it does
    // not end the run — the player retries it from the start of the leg.
    if (def.timeLimit && state.missionTimer > def.timeLimit) {
      state.missionTimer = 0;
      mission.held = false;
      mission.target = def.target();
      return 0;
    }
    // Mission 7 needs every cash drop collected before the hideout counts.
    // Touching the bank first must NOT finish the leg: only an empty drop
    // list moves the target to the Hideout.
    if (def.drops && !mission.held) {
      const left = state.pickups.filter((pk) => pk.kind === 'drop' && !pk.taken).length;
      if (left > 0) return 0;
      mission.held = true;
      mission.target = def.thenTarget();
      return 0;
    }

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
      // Mission 6 first leg: pick up the fare, then drive to the beach.
      if (def.thenTarget && !mission.held && !def.holdSeconds && !def.drops) {
        mission.held = true;
        mission.target = def.thenTarget();
        state.missionTimer = 0;
        helpers.addParticle(p.x, p.y, '#f2c94c', 20);
        return 0;
      }
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
