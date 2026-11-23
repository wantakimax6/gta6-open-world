// Solara Bay v2 3D: a working gta6-01 entry (Node 22, standard library only), now a full 3D
// open-world game with Three.js bundled locally and a custom Verlet ragdoll. The game is this
// directory's game/ folder, plain static files a desktop browser loads offline (game/index.html
// and its ES modules, with Three.js 0.170.0 bundled locally under game/vendor/ and no network
// request at runtime), and the program hands it in. It copies
// game/ and screenshots/ from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library. Solara Bay is my own original
// open-world crime game: Mara Voss drives, steals cars, runs eight Harbor Crew missions across a
// coastal city — including a final hunt where a snitch leaks her position to a rival gang —
// and outruns the Solara Bay police, with a HUD, minimap and wanted stars.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
// Copy the whole static game (including the bundled Three.js library and
// the staged screenshots) exactly as it is on disk.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json). This entry ships exactly 4 screenshots, all under 256 KiB, and one bundled
// library (Three.js 0.170.0) under game/vendor/ — no CDN, no network at runtime.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
