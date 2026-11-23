// Solara Bay v2 3D renderer: Three.js scene, modern PUBG-like look —
// ACES filmic tone mapping, sRGB output, soft shadows, hemisphere +
// directional sun that follows the player, fog, and a day/sunset/night
// cycle from the environment. The simulation (world.js) is the authority;
// this file only draws it, so the visuals can never disagree with the
// physics. Meshes are keyed by simulation object and rebuilt on reset.
import * as THREE from '../vendor/three.module.js';
import { SCALE, WORLD, CITY, QUALITY } from './config.js';
import { buildEnvironment } from './environment.js';
import { createPlayerMesh, createCameraRig } from './player.js';
import { createCarMesh } from './vehicles.js';
import { createPersonMesh } from './npc.js';
import { createRagdoll } from './ragdoll.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function simTo3D(x, y, z) {
  return new THREE.Vector3(x * SCALE, z || 0, -y * SCALE);
}

export function createRenderer(canvas, world, random) {
  // No MSAA antialiasing: in software rendering (headless / SwiftShader,
  // which is also how the screenshots are taken) MSAA multiplies the cost
  // of every pixel several times over. Edges stay clean enough at these
  // scales thanks to the tone mapping and soft shadows — and the smooth
  // blocky style has few thin edges to alias in the first place.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d9);
  scene.fog = new THREE.Fog(0xbfd4e0, 60, 260);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 500);
  camera.position.set(0, 20, 40);

  const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x3a4a3a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -35;
  sun.shadow.camera.right = 35;
  sun.shadow.camera.top = 35;
  sun.shadow.camera.bottom = -35;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);

  const env = buildEnvironment(THREE, world.state, random);
  scene.add(env.group);

  const playerMesh = createPlayerMesh(THREE);
  scene.add(playerMesh.group);
  const rig = createCameraRig(THREE, camera, env.colliders);

  const carMeshes = new Map();
  const policeMeshes = new Map();
  const pedMeshes = new Map();
  const rivalMeshes = new Map();
  const pickupMeshes = new Map();
  const ragdolls = new Map();
  let playerRagdoll = null;

  // Particles: one Points cloud, refilled every frame from state.
  const PARTICLE_MAX = 300;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PARTICLE_MAX * 3);
  const pCol = new Float32Array(PARTICLE_MAX * 3);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pMat = new THREE.PointsMaterial({ size: 0.35, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  // Mission marker: a pulsing ring and a light beam at the target.
  const markerRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.2, 0.12, 8, 40),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c }),
  );
  markerRing.rotation.x = -Math.PI / 2;
  scene.add(markerRing);
  const markerBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 22, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  scene.add(markerBeam);

  // Shot tracer: one reusable line from the gun toward the aim.
  const tracerGeo = new THREE.BufferGeometry();
  tracerGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }));
  tracer.frustumCulled = false;
  scene.add(tracer);

  let quality = 'high';
  let fps = 60;
  let frameCount = 0;
  let fpsTimer = 0;

  function applyQuality(name) {
    if (!QUALITY[name]) return;
    quality = name;
    const q = QUALITY[name];
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
    renderer.shadowMap.enabled = q.shadows;
    sun.castShadow = q.shadows;
    sun.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    scene.fog.far = q.far;
    camera.far = q.far + 80;
    camera.updateProjectionMatrix();
    resize();
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function syncCar(car, map, isPolice) {
    let mesh = map.get(car);
    if (!mesh) {
      mesh = createCarMesh(THREE, car.color, isPolice);
      scene.add(mesh.group);
      map.set(car, mesh);
    }
    return mesh;
  }

  function syncPerson(entity, map, isRival) {
    let mesh = map.get(entity);
    if (!mesh) {
      mesh = createPersonMesh(THREE, entity.color || '#7a1f1f', isRival);
      scene.add(mesh.group);
      map.set(entity, mesh);
    }
    return mesh;
  }

  function syncPickup(pickup) {
    let mesh = pickupMeshes.get(pickup);
    if (!mesh) {
      if (pickup.kind === 'cash' || pickup.kind === 'drop') {
        mesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.45, 0.16, 8, 18),
          new THREE.MeshStandardMaterial({ color: 0xf2c94c, roughness: 0.25, metalness: 0.8, emissive: 0x664d00, emissiveIntensity: 0.4 }),
        );
      } else if (pickup.kind === 'ammo') {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.35, 0.35),
          new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.4, metalness: 0.4 }),
        );
      } else {
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.5, 0.18),
          new THREE.MeshStandardMaterial({ color: 0x4ac9a0, roughness: 0.4, emissive: 0x1a5a40, emissiveIntensity: 0.5 }),
        );
      }
      mesh.castShadow = true;
      scene.add(mesh);
      pickupMeshes.set(pickup, mesh);
    }
    return mesh;
  }

  function spawnRagdoll(key, x, y, color, impulse) {
    if (ragdolls.has(key)) return ragdolls.get(key);
    const pos = simTo3D(x, y, 0);
    // Impulse is in sim (x, y) plane coordinates: sim y becomes 3D -z,
    // and the vertical component is always 0 (the ragdoll adds its own
    // upward pop). Passing sim y as vertical would fling bodies skyward.
    const doll = createRagdoll(THREE, scene, pos.x, pos.z, new THREE.Color(color).getHex(), impulse ? { x: impulse.x, y: 0, z: -impulse.y } : null, env.colliders);
    ragdolls.set(key, doll);
    return doll;
  }

  function clearDynamic() {
    for (const mesh of [...carMeshes.values(), ...policeMeshes.values(), ...pedMeshes.values(), ...rivalMeshes.values(), ...pickupMeshes.values()]) {
      scene.remove(mesh.group);
    }
    carMeshes.clear(); policeMeshes.clear(); pedMeshes.clear(); rivalMeshes.clear(); pickupMeshes.clear();
    for (const doll of ragdolls.values()) doll.dispose();
    ragdolls.clear();
    playerRagdoll = null;
  }

  function draw(state, screen, dt) {
    const p = state.player;
    const playerPos = simTo3D(p.x, p.y, p.z);

    // Sun follows the player so shadows stay crisp wherever Mara goes.
    const ang = state.timeOfDay * Math.PI * 2;
    sun.position.set(playerPos.x + Math.cos(ang) * 90, 55 + Math.sin(ang) * 55, playerPos.z + 55);
    sun.target.position.copy(playerPos);
    env.update(dt, state.timeOfDay, scene, sun, hemi);

    // Cars, police, pedestrians, rivals.
    for (const car of state.cars) {
      const mesh = syncCar(car, carMeshes, false);
      mesh.update(car, dt, state.elapsed);
    }
    for (const cruiser of state.police) {
      const mesh = syncCar(cruiser, policeMeshes, true);
      mesh.update(cruiser, dt, state.elapsed);
    }
    for (const ped of state.peds) {
      if (ped.ragdoll) {
        const doll = spawnRagdoll(ped, ped.x, ped.y, ped.color, ped.ragdollImpulse);
        doll.step(dt, state.elapsed);
        const mesh = pedMeshes.get(ped);
        if (mesh) mesh.group.visible = false;
        continue;
      }
      const mesh = syncPerson(ped, pedMeshes, false);
      mesh.update(ped, dt, camera);
    }
    for (const rival of state.rivals) {
      if (!rival.alive) {
        const mesh = rivalMeshes.get(rival);
        if (mesh) mesh.group.visible = false;
        continue;
      }
      const mesh = syncPerson(rival, rivalMeshes, true);
      mesh.update(rival, dt, camera);
    }

    // Player ragdoll: swap the animated character for the physics body.
    if (p.ragdoll && !playerRagdoll) {
      playerRagdoll = spawnRagdoll('__player', p.x, p.y, '#d23b3b', p.ragdollImpulse);
    }
    if (playerRagdoll) {
      playerRagdoll.step(dt, state.elapsed);
      if (!p.ragdoll) {
        playerRagdoll.dispose();
        ragdolls.delete('__player');
        playerRagdoll = null;
      }
    }
    playerMesh.update(p, dt, Math.abs(p.speed) > 10, Math.min(1, Math.abs(p.speed) / 265), !p.grounded);

    // Pickups: spin and bob; hide taken ones.
    for (const pickup of state.pickups) {
      const mesh = syncPickup(pickup);
      mesh.visible = !pickup.taken;
      if (!pickup.taken) {
        const pos = simTo3D(pickup.x, pickup.y, 0);
        mesh.position.set(pos.x, 0.7 + Math.sin(state.elapsed * 3 + pickup.x) * 0.15, pos.z);
        mesh.rotation.y += dt * 2.5;
      }
    }

    // Mission marker.
    if (state.mission) {
      const t = state.mission.target;
      const pos = simTo3D(t.x, t.y, 0);
      const pulse = 1 + Math.sin(state.elapsed * 4) * 0.12;
      markerRing.visible = true;
      markerBeam.visible = true;
      markerRing.position.set(pos.x, 0.15, pos.z);
      markerRing.scale.set(pulse, pulse, pulse);
      markerBeam.position.set(pos.x, 11, pos.z);
      markerBeam.material.opacity = 0.22 + Math.sin(state.elapsed * 4) * 0.08;
    } else {
      markerRing.visible = false;
      markerBeam.visible = false;
    }

    // Particles.
    let n = 0;
    for (const part of state.particles) {
      if (n >= PARTICLE_MAX) break;
      const c = new THREE.Color(part.color);
      pPos[n * 3] = part.x * SCALE;
      pPos[n * 3 + 1] = 0.6 + (part.life * 0.8);
      pPos[n * 3 + 2] = -part.y * SCALE;
      pCol[n * 3] = c.r;
      pCol[n * 3 + 1] = c.g;
      pCol[n * 3 + 2] = c.b;
      n += 1;
    }
    pGeo.setDrawRange(0, n);
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;

    // Shot tracer: visible briefly right after Mara fires.
    if (p.shootTimer > 0.2 && p.shootTimer <= 0.28 && !p.inCar) {
      const from = simTo3D(p.x, p.y, 0);
      from.y = 1.4;
      const to = new THREE.Vector3(
        from.x + Math.cos(p.angle) * 24,
        1.4,
        from.z - Math.sin(p.angle) * 24,
      );
      const attr = tracerGeo.attributes.position;
      attr.setXYZ(0, from.x, from.y, from.z);
      attr.setXYZ(1, to.x, to.y, to.z);
      attr.needsUpdate = true;
      tracer.material.opacity = 0.9;
    } else {
      tracer.material.opacity = 0;
    }

    // Camera: cinematic orbit on the title screen, TPP follow in play.
    if (screen === SCREEN_TITLE) {
      // Cinematic orbit above the rooftops: the tallest buildings reach
      // ~31 m, so a low camera could sit inside one. 45 m clears them and
      // shows the whole city, beach and ocean in one establishing shot.
      const t = state.elapsed * 0.12;
      const cx = WORLD.width / 2 * SCALE;
      const cz = -WORLD.height / 2 * SCALE;
      camera.position.set(cx + Math.cos(t) * 85, 45, cz + Math.sin(t) * 85);
      camera.lookAt(cx, 4, cz);
    } else {
      rig.update(p, dt, p.inCar);
    }

    renderer.render(scene, camera);

    frameCount += 1;
    fpsTimer += dt;
    if (fpsTimer >= 0.5) {
      fps = Math.round(frameCount / fpsTimer);
      frameCount = 0;
      fpsTimer = 0;
    }
    // Expose the live FPS for tests and the HUD, in both play and shots.
    window.__fps = fps;
  }

  resize();
  window.addEventListener('resize', resize);
  applyQuality('high');

  // Debug handle for testing (harmless in play): lets a test move the
  // camera, time a single render, and inspect the scene.
  window.__solara = { scene, camera, renderer, sun, hemi, rig, playerMesh, world };

  return {
    draw,
    applyQuality,
    reset: clearDynamic,
    get fps() { return fps; },
    get cameraYaw() { return rig.yaw; },
    orbitCamera(dx, dy) { rig.orbit(dx, dy); },
    snapCamera() { rig.snap(world.state.player); },
  };
}
