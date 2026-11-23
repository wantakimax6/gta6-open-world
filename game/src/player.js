// Solara Bay v2 3D player, rewritten in the rebuild session: a fully
// visible third-person character and the TPP camera rig. The character is
// built from pivoted boxes (a procedural humanoid): torso, head, arms and
// legs swing with a walk/run cycle, tuck on a jump, and lean into turns.
// The camera sits behind the character, orbits with the mouse, and
// smoothly follows — the character is always clearly visible from behind,
// Dude Theft Wars style, but with clean, modern proportions and materials.
// The rig also keeps the view honest: it pulls in front of walls and
// never hovers over a roof, so a building can never fill the frame and
// hide Mara or her car.
import { SCALE } from './config.js';

function limb(THREE, w, h, d, color, px, py, pz) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05 }));
  mesh.position.set(px, py, pz);
  mesh.castShadow = true;
  return mesh;
}

export function createPlayerMesh(THREE) {
  const group = new THREE.Group();
  const jacket = 0xd23b3b;
  const pants = 0x2a2f3a;
  const skin = 0xe8b98a;
  const hair = 0x1a1a1a;

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.72, 0.34),
    new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.7, metalness: 0.05 }),
  );
  torso.position.y = 1.18;
  torso.castShadow = true;
  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.36, 0.32),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.65 }),
  );
  head.position.y = 1.74;
  head.castShadow = true;
  group.add(head);
  const hairMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.14, 0.34),
    new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 }),
  );
  hairMesh.position.y = 1.94;
  group.add(hairMesh);

  const armL = limb(THREE, 0.16, 0.62, 0.16, jacket, -0.4, 1.5, 0);
  const armR = limb(THREE, 0.16, 0.62, 0.16, jacket, 0.4, 1.5, 0);
  const legL = limb(THREE, 0.2, 0.78, 0.2, pants, -0.16, 0.82, 0);
  const legR = limb(THREE, 0.2, 0.78, 0.2, pants, 0.16, 0.82, 0);
  group.add(armL, armR, legL, legR);

  // A pistol in the right hand, only visible while shooting is possible.
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.07, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 }),
  );
  gun.position.set(0, -0.6, 0.08);
  armR.add(gun);

  return {
    group,
    update(p, dt, moving, speed01, jumping) {
      const swing = moving ? Math.sin(p.walkPhase * 2) * 0.65 * (0.5 + speed01) : 0;
      const targetArmL = swing;
      const targetArmR = -swing;
      const targetLegL = -swing;
      const targetLegR = swing;
      if (jumping) {
        legL.rotation.z = 0.5;
        legR.rotation.z = -0.3;
        armL.rotation.z = 0.5;
        armR.rotation.z = -0.5;
      } else {
        legL.rotation.z += (targetLegL - legL.rotation.z) * Math.min(1, dt * 14);
        legR.rotation.z += (targetLegR - legR.rotation.z) * Math.min(1, dt * 14);
        armL.rotation.z += (targetArmL - armL.rotation.z) * Math.min(1, dt * 14);
        armR.rotation.z += (targetArmR - armR.rotation.z) * Math.min(1, dt * 14);
      }
      // Lean forward slightly while running, breathe while idle.
      torso.rotation.x = moving ? -0.09 * speed01 : 0;
      torso.position.y = 1.18 + (moving ? 0 : Math.sin(p.walkPhase * 0.5) * 0.01);
      group.position.set(p.x * SCALE, p.z * SCALE, -p.y * SCALE);
      group.rotation.y = -p.angle;
      group.visible = !p.inCar && !p.ragdoll;
      gun.visible = p.ammo > 0;
    },
  };
}

export function createCameraRig(THREE, camera, colliders) {
  let yaw = -Math.PI / 2;
  let pitch = 0.32;
  let dist = 7.5;
  const target = new THREE.Vector3();
  const boxes = colliders || [];

  // Pull the camera in front of any building between it and the player,
  // so the view is never blocked by a wall or a roof.
  function collide(px, py, pz, cx, cy, cz) {
    let tBest = 1;
    const dx = cx - px;
    const dy = cy - py;
    const dz = cz - pz;
    for (const box of boxes) {
      if (py > box.height && cy > box.height) continue;
      let t0 = 0;
      let t1 = 1;
      let ok = true;
      const mins = [box.minX, 0, box.minZ];
      const maxs = [box.maxX, box.height, box.maxZ];
      const o = [px, py, pz];
      const d = [dx, dy, dz];
      for (let i = 0; i < 3; i += 1) {
        if (Math.abs(d[i]) < 1e-9) {
          if (o[i] < mins[i] || o[i] > maxs[i]) { ok = false; break; }
        } else {
          let ta = (mins[i] - o[i]) / d[i];
          let tb = (maxs[i] - o[i]) / d[i];
          if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; }
          if (ta > t0) t0 = ta;
          if (tb < t1) t1 = tb;
          if (t0 > t1) { ok = false; break; }
        }
      }
      if (ok && t0 < tBest && t0 > 0) tBest = t0;
    }
    if (tBest < 1) {
      const f = Math.max(0.12, tBest - 0.06);
      return [px + dx * f, Math.max(0.6, py + dy * f), pz + dz * f];
    }
    return [cx, Math.max(0.6, cy), cz];
  }

  function desired(p, inCar) {
    const wantDist = inCar ? 9 : 7;
    dist += (wantDist - dist) * 0.05;
    // In a car the camera rides closer, higher and looks down more
    // steeply: at road level, a tall building 1-2 m to the side fills half
    // the frame with its black shadowed wall. Looking down keeps the road
    // and the car in frame instead of the wall.
    const pitchHere = inCar ? 0.5 : pitch;
    const px = p.x * SCALE;
    const py = p.z * SCALE + 1.6;
    const pz = -p.y * SCALE;
    let cx = px - Math.cos(yaw) * Math.cos(pitchHere) * dist;
    let cy = py + Math.sin(pitchHere) * dist + (inCar ? 1.4 : 0.4);
    let cz = pz + Math.sin(yaw) * Math.cos(pitchHere) * dist;
    [cx, cy, cz] = collide(px, py, pz, cx, cy, cz);
    // Never hover over a roof: when the car drives past a low building,
    // the camera can end up right above its roof, and the roof then fills
    // the foreground and hides the car. Pull toward the player until the
    // camera is off every building footprint (or very close to the player).
    const ox = cx - px;
    const oy = cy - py;
    const oz = cz - pz;
    let f = 1;
    for (; f > 0.2; f -= 0.05) {
      const x = px + ox * f;
      const y = py + oy * f;
      const z = pz + oz * f;
      let over = false;
      for (const box of boxes) {
        if (x >= box.minX && x <= box.maxX && z >= box.minZ && z <= box.maxZ && y < box.height + 2) { over = true; break; }
      }
      if (!over) break;
    }
    if (f < 1) {
      cx = px + ox * f;
      cy = Math.max(0.6, py + oy * f);
      cz = pz + oz * f;
    }
    return { px, py, pz, cx, cy, cz };
  }

  return {
    get yaw() { return yaw; },
    orbit(dx, dy) {
      yaw -= dx * 0.005;
      pitch = Math.max(0.08, Math.min(1.1, pitch + dy * 0.004));
    },
    update(p, dt, inCar) {
      // The camera trails the character's heading, smoothed so turns do
      // not snap. In a car it pulls back and up for a driving view.
      let diff = p.angle - yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw += diff * Math.min(1, dt * (inCar ? 2.2 : 3.2));
      const d = desired(p, inCar);
      camera.position.x += (d.cx - camera.position.x) * Math.min(1, dt * 8);
      camera.position.y += (d.cy - camera.position.y) * Math.min(1, dt * 8);
      camera.position.z += (d.cz - camera.position.z) * Math.min(1, dt * 8);
      target.set(d.px + Math.cos(yaw) * 2, d.py + 0.4, d.pz - Math.sin(yaw) * 2);
      camera.lookAt(target);
    },
    snap(p) {
      yaw = p.angle;
      dist = p.inCar ? 9 : 7;
      const d = desired(p, p.inCar);
      camera.position.set(d.cx, d.cy, d.cz);
      target.set(d.px + Math.cos(yaw) * 2, d.py + 0.4, d.pz - Math.sin(yaw) * 2);
      camera.lookAt(target);
    },
  };
}

// Rebuild pass 2 — re-checked line by line in the new recording session.
