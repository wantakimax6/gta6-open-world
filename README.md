# gta6-open-world

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/wantakimax6/gta6-open-world/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/wantakimax6/gta6-open-world/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solara Bay is an original 3D open-world crime game: explore a sun-soaked 1980s coastal city in third person as Mara Voss, steal cars, run eight Harbor Crew missions, and outrun the Solara Bay police. Built with Three.js 0.170.0 (bundled locally, no network at runtime) and a custom Verlet ragdoll physics system — no physics library, no CDN. The graphics are smooth low-poly blocks in the Dude Theft Wars spirit — clean, modern lighting and colors, smooth animation, camera and driving — chosen deliberately over realism so the game stays fast, stable and fully playable.

## What is in the game

- **3D open world**: a tropical coastal city with varied buildings, neon signs, palm trees, streetlights, a beach, ocean and a pier, with a full day → sunset → night cycle, modern lighting, soft shadows and fog.
- **Third-person play**: walk, run, sprint and jump with a visible character and an orbitable TPP camera that never clips through walls and never hovers over a roof.
- **Ragdoll physics**: a real Verlet simulation — cars throw pedestrians and Mara into tumbling ragdolls that settle and recover.
- **Driving**: enter and steal cars, working wheels, steering, suspension, traffic and police chases.
- **Gameplay**: health, combat (punch and pistol), 1–5 wanted stars, police cruisers, money, ammo and health pickups, 8 missions, HUD with a red alert banner, minimap that also shows rivals, pause menu, quality settings and a localStorage save.

## Missions

1. Sunrise Courier — pick up the package at Harbor Market.
2. The Drop — deliver it to Solara Pier.
3. Borrowed Wheels — steal the orange sports car at the Garage.
4. Heat on the Strip — survive wanted level 3, then reach the Hideout.
5. The Bay Heist — hold the Bay Bank for 10 seconds, then escape.
6. Neon Taxi — pick up a fare on the Neon Strip and race them to Sunset Beach.
7. Sunset Getaway — grab three cash drops, then reach the Hideout.
8. Rat in the Crew — a snitch in the crew leaks your position to the Viper gang, who hunt you in a pack; survive the hunt, then reach the Hideout.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. WASD move/drive, Space jump, E enter a car, F shoot, J punch, P pause, drag the mouse to look around.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7cr8pacd&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>

<!-- Rebuild pass 2 — re-checked in the new recording session. -->
