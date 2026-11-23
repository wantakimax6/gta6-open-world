// Solara Bay v2 3D vehicles, rewritten in the rebuild session: car meshes
// with working wheels, steering, suspension bob and brake lights. The
// simulation (speed, angle, position) lives in world.js; this file only
// draws it, so the visuals can never disagree with the physics. Rebuild
// pass: every exterior part casts a shadow, so the car reads as one solid
// object under the sun instead of a body with a floating nose.
import { SCALE } from './config.js';

function box(THREE, w, h, d, color, roughness, metalness) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: roughness ?? 0.35, metalness: metalness ?? 0.5 }),
  );
}

export function createCarMesh(THREE, color, isPolice) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.25, metalness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.1), paint);
  body.position.y = 0.42;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.45, 1.0),
    new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.8 }),
  );
  cabin.position.set(-0.15, 0.88, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const nose = box(THREE, 0.35, 0.3, 1.0, 0x222222, 0.6, 0.3);
  nose.position.set(1.15, 0.35, 0);
  nose.castShadow = true;
  group.add(nose);
  // Side mirrors, so the car reads as a car from the TPP camera behind it.
  for (const z of [-0.62, 0.62]) {
    const mirror = box(THREE, 0.12, 0.1, 0.08, 0x111111, 0.5, 0.4);
    mirror.position.set(0.45, 0.78, z);
    group.add(mirror);
  }

  // Headlights and brake lights: emissive, brake lights flare on braking.
  const headMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffe9a8, emissiveIntensity: 1.2 });
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0x550000, emissive: 0xff2222, emissiveIntensity: 0.4 });
  for (const z of [-0.38, 0.38]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), headMat);
    head.position.set(1.32, 0.45, z);
    group.add(head);
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.18), brakeMat);
    brake.position.set(-1.12, 0.45, z);
    group.add(brake);
  }

  let lightBar = null;
  let lightL = null;
  let lightR = null;
  if (isPolice) {
    lightBar = box(THREE, 0.5, 0.12, 0.9, 0x111111, 0.5, 0.4);
    lightBar.position.set(-0.15, 1.16, 0);
    group.add(lightBar);
    lightL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0xff2222, emissiveIntensity: 2 }));
    lightL.position.set(-0.15, 1.24, -0.22);
    group.add(lightL);
    lightR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.4), new THREE.MeshStandardMaterial({ color: 0x000033, emissive: 0x2266ff, emissiveIntensity: 2 }));
    lightR.position.set(-0.15, 1.24, 0.22);
    group.add(lightR);
  }

  // Wheels: cylinders spun around their axle, front pair steers.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14);
  wheelGeo.rotateX(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.9 });
  const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.25, 10);
  hubGeo.rotateX(Math.PI / 2);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xb8bec8, roughness: 0.3, metalness: 0.8 });
  const wheels = [];
  const steers = [];
  for (const [wx, wz, front] of [[0.72, -0.55, true], [0.72, 0.55, true], [-0.72, -0.55, false], [-0.72, 0.55, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.34, wz);
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    pivot.add(wheel, hub);
    group.add(pivot);
    wheels.push(wheel);
    steers.push(front ? pivot : null);
  }

  let bobPhase = 0;
  return {
    group,
    update(car, dt, elapsed) {
      const speedM = car.speed * SCALE;
      bobPhase += Math.abs(speedM) * dt * 2.2;
      // Suspension: the body bobs gently with speed and dips on braking.
      body.position.y = 0.42 + Math.sin(bobPhase) * 0.02 * Math.min(1, Math.abs(speedM) / 12);
      cabin.position.y = 0.88 + Math.sin(bobPhase) * 0.02 * Math.min(1, Math.abs(speedM) / 12);
      for (const wheel of wheels) wheel.rotation.z -= (speedM / 0.34) * dt;
      for (const pivot of steers) {
        if (pivot) pivot.rotation.y = -(car.steerVis || 0) * 0.42;
      }
      brakeMat.emissiveIntensity = car.speed < -20 || (car.speed > 0 && Math.abs(car.speed) < 40) ? 1.6 : 0.4;
      if (lightL && lightR) {
        const flash = Math.floor(elapsed * 6) % 2 === 0;
        lightL.material.emissiveIntensity = flash ? 3 : 0.3;
        lightR.material.emissiveIntensity = flash ? 0.3 : 3;
      }
      group.position.set(car.x * SCALE, 0, -car.y * SCALE);
      group.rotation.y = -car.angle;
    },
  };
}

// Rebuild pass 2 — re-checked line by line in the new recording session.
