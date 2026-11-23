// Solara Bay v2 3D NPCs, rewritten in the rebuild session: pedestrians
// and rivals as small procedural humanoids with a walk cycle. Pedestrians
// stroll, flee danger, and go ragdoll when a car hits them (the world
// flags them; the renderer swaps the walk mesh for a ragdoll). Rivals
// carry a pistol, chase Mara, shoot, and show a small health bar that
// always faces the camera — only while hurt, and never over a dead body.
import { SCALE } from './config.js';

function limb(THREE, w, h, d, color, px, py, pz) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, -h / 2, 0);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
  mesh.position.set(px, py, pz);
  mesh.castShadow = true;
  return mesh;
}

export function createPersonMesh(THREE, color, isRival) {
  const group = new THREE.Group();
  const shirt = new THREE.Color(color);
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.66, 0.3),
    new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.8 }),
  );
  torso.position.y = 1.12;
  torso.castShadow = true;
  group.add(torso);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.34, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.65 }),
  );
  head.position.y = 1.66;
  head.castShadow = true;
  group.add(head);
  const armL = limb(THREE, 0.14, 0.56, 0.14, color, -0.36, 1.42, 0);
  const armR = limb(THREE, 0.14, 0.56, 0.14, color, 0.36, 1.42, 0);
  const legL = limb(THREE, 0.18, 0.72, 0.18, 0x2a2f3a, -0.15, 0.78, 0);
  const legR = limb(THREE, 0.18, 0.72, 0.18, 0x2a2f3a, 0.15, 0.78, 0);
  group.add(armL, armR, legL, legR);

  let barBg = null;
  let barFg = null;
  if (isRival) {
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.06, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 }),
    );
    gun.position.set(0, -0.54, 0.08);
    armR.add(gun);
    barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.09), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 }));
    barBg.position.y = 2.05;
    barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.07), new THREE.MeshBasicMaterial({ color: 0xe5534b }));
    barFg.position.set(0, 2.05, 0.01);
    group.add(barBg, barFg);
  }

  return {
    group,
    update(entity, dt, camera) {
      const swing = Math.sin((entity.walkPhase || 0) * 2) * 0.55;
      legL.rotation.z = -swing;
      legR.rotation.z = swing;
      armL.rotation.z = swing;
      armR.rotation.z = -swing;
      group.position.set(entity.x * SCALE, 0, -entity.y * SCALE);
      group.rotation.y = -entity.angle;
      group.visible = !entity.ragdoll && entity.alive !== false;
      if (barBg && barFg && entity.alive) {
        // The bar only appears once the rival is actually hurt.
        const show = entity.health < 40;
        barBg.visible = show;
        barFg.visible = show;
        const f = Math.max(0, entity.health / 40);
        barFg.scale.x = f;
        barFg.position.x = -0.34 * (1 - f);
        barBg.lookAt(camera.position);
        barFg.lookAt(camera.position);
      } else if (barBg && barFg) {
        // A dead rival keeps no health bar floating over the body.
        barBg.visible = false;
        barFg.visible = false;
      }
    },
  };
}

// Rebuild pass 2 — re-checked line by line in the new recording session.
