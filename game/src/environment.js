// Solara Bay v2 3D environment: the city itself, built once from the
// simulated city plan. Modern, clean, PUBG-like rendering: standard
// materials with roughness/metalness, instanced repetition (palms,
// streetlights, windows, road markings), emissive neon, and a full
// day → sunset → night cycle that drives the sun, sky, fog and lights.
// The 1980s Vice City atmosphere comes from the palette and neon, the
// modern quality from the lighting, shadows and clean materials.
// Final pass: building boxes are inset 0.8 m from their simulation
// footprint so streets read wider and the TPP camera never sits 3 m from
// a sheer wall, and the hemisphere light is strong enough that a wall
// facing away from the sun still reads as a wall, never a black void.
import { SCALE, WORLD, CITY } from './config.js';

const ROAD_CENTERS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
const NEON_COLORS = [0xff2e88, 0x00e5ff, 0xffd23f, 0x7cff4a, 0xff6b35, 0xb967ff];

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpColor(c1, c2, t) {
  return {
    r: lerp(c1.r, c2.r, t),
    g: lerp(c1.g, c2.g, t),
    b: lerp(c1.b, c2.b, t),
  };
}

// Day, sunset, night, dawn keyframes for sky, fog, sun and ambient.
const SKY_STOPS = [
  { t: 0.0, sky: { r: 0.98, g: 0.62, b: 0.45 }, fog: { r: 0.96, g: 0.72, b: 0.6 }, sun: 0xffb37a, sunI: 1.6, hemi: 0.75 },
  { t: 0.25, sky: { r: 0.53, g: 0.78, b: 0.94 }, fog: { r: 0.75, g: 0.85, b: 0.92 }, sun: 0xfff2d8, sunI: 2.6, hemi: 1.15 },
  { t: 0.5, sky: { r: 0.99, g: 0.55, b: 0.38 }, fog: { r: 0.98, g: 0.62, b: 0.5 }, sun: 0xff7a3c, sunI: 2.1, hemi: 0.85 },
  { t: 0.62, sky: { r: 0.16, g: 0.2, b: 0.38 }, fog: { r: 0.2, g: 0.24, b: 0.4 }, sun: 0x8a7bff, sunI: 0.5, hemi: 0.4 },
  { t: 0.8, sky: { r: 0.05, g: 0.08, b: 0.18 }, fog: { r: 0.07, g: 0.1, b: 0.2 }, sun: 0x4a5a8a, sunI: 0.25, hemi: 0.3 },
  { t: 1.0, sky: { r: 0.98, g: 0.62, b: 0.45 }, fog: { r: 0.96, g: 0.72, b: 0.6 }, sun: 0xffb37a, sunI: 1.6, hemi: 0.75 },
];

function skyAt(t) {
  let a = SKY_STOPS[0];
  let b = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i += 1) {
    if (t >= SKY_STOPS[i].t && t <= SKY_STOPS[i + 1].t) { a = SKY_STOPS[i]; b = SKY_STOPS[i + 1]; break; }
  }
  const f = (t - a.t) / Math.max(0.0001, b.t - a.t);
  return {
    sky: lerpColor(a.sky, b.sky, f),
    fog: lerpColor(a.fog, b.fog, f),
    sunI: lerp(a.sunI, b.sunI, f),
    hemi: lerp(a.hemi, b.hemi, f),
    night: t > 0.6 && t < 0.98 ? 1 : 0,
  };
}

export function buildEnvironment(THREE, state, random) {
  const group = new THREE.Group();
  const colliders = [];
  const W = WORLD.width * SCALE;
  const H = WORLD.height * SCALE;

  // Ground: grass, sand beach along the south edge, ocean beyond it.
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ color: 0x6fae5e, roughness: 1, metalness: 0 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.set(W / 2, 0, -H / 2);
  grass.receiveShadow = true;
  group.add(grass);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(W, 8),
    new THREE.MeshStandardMaterial({ color: 0xe8d29a, roughness: 1, metalness: 0 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(W / 2, 0.01, -H + 4);
  sand.receiveShadow = true;
  group.add(sand);

  const oceanMat = new THREE.MeshStandardMaterial({ color: 0x1e6fa8, roughness: 0.25, metalness: 0.1 });
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 40), oceanMat);
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(W / 2, -0.15, -H - 16);
  group.add(ocean);

  // Roads: asphalt planes, sidewalks as lighter strips, centre dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x2e323b, roughness: 0.95, metalness: 0 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x8f959e, roughness: 1, metalness: 0 });
  for (const c of ROAD_CENTERS) {
    const cx = c * SCALE;
    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth * SCALE, H), roadMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(cx, 0.02, -H / 2);
    vRoad.receiveShadow = true;
    group.add(vRoad);
    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(W, WORLD.roadWidth * SCALE), roadMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(W / 2, 0.02, -cx);
    hRoad.receiveShadow = true;
    group.add(hRoad);
    const vWalk = new THREE.Mesh(new THREE.PlaneGeometry((WORLD.roadWidth + 14) * SCALE, H), walkMat);
    vWalk.rotation.x = -Math.PI / 2;
    vWalk.position.set(cx, 0.012, -H / 2);
    vWalk.receiveShadow = true;
    group.add(vWalk);
    const hWalk = new THREE.Mesh(new THREE.PlaneGeometry(W, (WORLD.roadWidth + 14) * SCALE), walkMat);
    hWalk.rotation.x = -Math.PI / 2;
    hWalk.position.set(W / 2, 0.012, -cx);
    hWalk.receiveShadow = true;
    group.add(hWalk);
  }
  // Centre dashes, instanced: one yellow dash every 4 m along every road.
  const dashGeo = new THREE.BoxGeometry(0.18, 0.02, 1.1);
  const dashMat = new THREE.MeshStandardMaterial({ color: 0xe8d44d, roughness: 0.8 });
  const dashCount = ROAD_CENTERS.length * 2 * 40;
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
  {
    const m = new THREE.Matrix4();
    let i = 0;
    for (const c of ROAD_CENTERS) {
      for (let d = 4; d < WORLD.width; d += 8) {
        m.makeTranslation(d * SCALE, 0.035, -c * SCALE);
        dashes.setMatrixAt(i, m);
        i += 1;
        m.makeTranslation(c * SCALE, 0.035, -d * SCALE);
        m.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
        dashes.setMatrixAt(i, m);
        i += 1;
      }
    }
    dashes.count = i;
  }
  group.add(dashes);

  // Parks: darker green lawns with a few trees.
  const parkMat = new THREE.MeshStandardMaterial({ color: 0x4d8a3f, roughness: 1 });
  for (const park of state.parks) {
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(park.w * SCALE, park.h * SCALE), parkMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set((park.x + park.w / 2) * SCALE, 0.015, -(park.y + park.h / 2) * SCALE);
    lawn.receiveShadow = true;
    group.add(lawn);
  }

  // Buildings: boxes with varied heights, a darker base, a roof cap, and
  // instanced lit windows on the street-facing side.
  // The visual box is inset 0.8 m from the simulation footprint on every
  // side: the streets read wider, the TPP camera (which trails the car
  // down the road) no longer sits 3 m from a sheer wall, and collision
  // stays on the full footprint, so the car stops short of the visual
  // wall instead of clipping it.
  const INSET = 16; // sim units = 0.8 m
  const windowGeo = new THREE.PlaneGeometry(0.55, 0.75);
  const windowMat = new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffc94d, emissiveIntensity: 0.55, roughness: 0.4 });
  const windowPositions = [];
  const neonMats = [];
  state.buildings.forEach((b, bi) => {
    const w = (b.w - INSET * 2) * SCALE;
    const d = (b.h - INSET * 2) * SCALE;
    const h = 6 + ((bi * 37) % 17) + random() * 8;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(b.color), roughness: 0.85, metalness: 0.05 }),
    );
    body.position.set((b.x + b.w / 2) * SCALE, h / 2, -(b.y + b.h / 2) * SCALE);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, 0.5, d * 0.92),
      new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.9 }),
    );
    roof.position.set(body.position.x, h + 0.25, body.position.z);
    group.add(roof);
    colliders.push({
      minX: b.x * SCALE, maxX: (b.x + b.w) * SCALE,
      minZ: -(b.y + b.h) * SCALE, maxZ: -b.y * SCALE,
      height: h,
    });
    // Windows on the south face of the inset box, two rows.
    const cols = Math.max(2, Math.floor(w / 1.6));
    for (let r = 0; r < 2; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        windowPositions.push([
          (b.x + INSET + 1 + (c + 0.5) * (w / cols)) * SCALE,
          2.2 + r * 2.6,
          -(b.y + INSET) * SCALE + 0.03,
        ]);
      }
    }
    // Neon sign on some buildings along the Strip and the beach road.
    if (bi % 4 === 1) {
      const neon = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(3.2, w * 0.7), 0.6),
        new THREE.MeshStandardMaterial({
          color: 0x111111, emissive: NEON_COLORS[bi % NEON_COLORS.length],
          emissiveIntensity: 1.6, roughness: 0.4,
        }),
      );
      neon.position.set(body.position.x, Math.min(h - 1, 5.5), -(b.y + INSET) * SCALE + 0.05);
      group.add(neon);
      neonMats.push(neon.material);
    }
  });
  const windows = new THREE.InstancedMesh(windowGeo, windowMat, Math.max(1, windowPositions.length));
  {
    const m = new THREE.Matrix4();
    windowPositions.forEach((p, i) => {
      m.makeTranslation(p[0], p[1], p[2]);
      windows.setMatrixAt(i, m);
    });
    windows.count = windowPositions.length;
  }
  group.add(windows);

  // Palm trees: instanced trunks and crowns along the beach and parks.
  const palmSpots = [];
  for (let x = 100; x < WORLD.width; x += 90) {
    if (random() < 0.75) palmSpots.push([x + random() * 40, 2260 + random() * 60]);
  }
  for (const park of state.parks) {
    palmSpots.push([park.x + park.w * 0.3, park.y + park.h * 0.3]);
    palmSpots.push([park.x + park.w * 0.7, park.y + park.h * 0.7]);
  }
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 3.4, 7);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6d4b, roughness: 1 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmSpots.length);
  const crownGeo = new THREE.ConeGeometry(1.5, 1.1, 7);
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.9 });
  const crowns = new THREE.InstancedMesh(crownGeo, crownMat, palmSpots.length);
  {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    palmSpots.forEach((p, i) => {
      const px = p[0] * SCALE;
      const pz = -p[1] * SCALE;
      m.compose(new THREE.Vector3(px, 1.7, pz), q, new THREE.Vector3(1, 1, 1));
      trunks.setMatrixAt(i, m);
      e.set(0, random() * Math.PI, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(px, 3.7, pz), q, new THREE.Vector3(1, 0.55, 1));
      crowns.setMatrixAt(i, m);
    });
    trunks.castShadow = true;
    crowns.castShadow = true;
  }
  group.add(trunks, crowns);

  // Streetlights: instanced poles with emissive bulbs, bright at night.
  const lightSpots = [];
  for (const c of ROAD_CENTERS) {
    for (let d = 300; d < WORLD.width; d += 600) {
      lightSpots.push([c + 55, d]);
      lightSpots.push([d, c + 55]);
    }
  }
  const poleGeo = new THREE.CylinderGeometry(0.07, 0.09, 4.2, 6);
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a, roughness: 0.6, metalness: 0.6 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, lightSpots.length);
  const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffe9a8, emissiveIntensity: 0.4 });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lightSpots.length);
  {
    const m = new THREE.Matrix4();
    lightSpots.forEach((p, i) => {
      m.makeTranslation(p[0] * SCALE, 2.1, -p[1] * SCALE);
      poles.setMatrixAt(i, m);
      m.makeTranslation(p[0] * SCALE, 4.25, -p[1] * SCALE);
      bulbs.setMatrixAt(i, m);
    });
  }
  group.add(poles, bulbs);

  // The pier at Solara Pier: planks out over the ocean.
  const pierMat = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 1 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 14), pierMat);
  pier.position.set(CITY.pier.x * SCALE, 0.4, -CITY.pier.y * SCALE - 7);
  pier.castShadow = true;
  group.add(pier);

  // Mission landmarks: a gold beacon column over the Hideout and the bank.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.35 });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 18, 10, 1, true), beaconMat);
  beacon.position.set(CITY.hideout.x * SCALE, 9, -CITY.hideout.y * SCALE);
  group.add(beacon);

  return {
    group,
    colliders,
    update(dt, timeOfDay, scene, sun, hemi) {
      // Gentle ocean swell so the sea is never a dead flat plane.
      ocean.position.y = -0.15 + Math.sin(performance.now() / 900) * 0.06;
      const s = skyAt(timeOfDay);
      scene.background.setRGB(s.sky.r, s.sky.g, s.sky.b);
      if (scene.fog) scene.fog.color.setRGB(s.fog.r, s.fog.g, s.fog.b);
      sun.intensity = s.sunI;
      const ang = timeOfDay * Math.PI * 2;
      sun.position.set(Math.cos(ang) * 120, 40 + Math.sin(ang) * 80, 60);
      hemi.intensity = s.hemi;
      bulbMat.emissiveIntensity = s.night ? 2.2 : 0.35;
      windowMat.emissiveIntensity = s.night ? 1.4 : 0.45;
      for (const m of neonMats) m.emissiveIntensity = s.night ? 2.6 : 1.2;
      oceanMat.color.setHex(s.night ? 0x0d2f4a : 0x1e6fa8);
      beaconMat.opacity = 0.25 + Math.sin(timeOfDay * 40) * 0.08;
    },
  };
}
