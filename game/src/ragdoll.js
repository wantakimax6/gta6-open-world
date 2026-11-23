// Solara Bay v2 3D ragdoll: a real Verlet physics ragdoll, not an animation.
// Seven point masses (head, chest, pelvis, two hands, two feet) with mass,
// gravity, velocity from their previous position, damping and friction,
// held together by distance constraints (the joints) solved iteratively,
// colliding with the ground plane and building boxes. A car hit gives the
// points an impulse; the body then tumbles, settles, and the character
// recovers. No physics library is used: Rapier's wasm runtime would add
// ~2 MB and an async init to a static offline bundle, and a failed init
// would leave the game with no physics at all. This Verlet solver runs
// synchronously, deterministically, and in a few microseconds per frame.
// Final pass: five constraint iterations per step, so the joints hold
// their shape a little stiffer while the body tumbles.
import { SCALE } from './config.js';

const GRAVITY = -22; // m/s^2, in 3D metres
const DAMPING = 0.985;
const GROUND_FRICTION = 0.82;
const ITERATIONS = 5;

// Joint distances, in metres, for a ~1.8 m body.
const LINKS = [
  ['head', 'chest', 0.32],
  ['chest', 'pelvis', 0.48],
  ['chest', 'handL', 0.68],
  ['chest', 'handR', 0.68],
  ['pelvis', 'footL', 0.85],
  ['pelvis', 'footR', 0.85],
  ['head', 'pelvis', 0.72],
  ['handL', 'handR', 1.25],
  ['footL', 'footR', 0.9],
];

const POINT_DEFS = [
  ['head', 0, 1.62, 0],
  ['chest', 0, 1.22, 0],
  ['pelvis', 0, 0.78, 0],
  ['handL', -0.42, 1.15, 0],
  ['handR', 0.42, 1.15, 0],
  ['footL', -0.18, 0.08, 0],
  ['footR', 0.18, 0.08, 0],
];

export function createRagdoll(THREE, scene, x, z, color, impulse, colliders) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.65, metalness: 0 });
  const points = {};
  for (const [name, dx, dy, dz] of POINT_DEFS) {
    const px = x + dx;
    const pz = z + dz;
    points[name] = {
      pos: new THREE.Vector3(px, dy, pz),
      prev: new THREE.Vector3(px, dy, pz),
      mass: name === 'pelvis' || name === 'chest' ? 2 : 1,
    };
  }
  // The impulse is the car (or blast) velocity, in sim units per second;
  // convert to metres and fling the chest/head hardest, limbs trailing.
  if (impulse) {
    const ix = impulse.x * SCALE;
    const iz = impulse.z * SCALE;
    const iy = (impulse.y || 0) * SCALE + 2.2;
    for (const [name, point] of Object.entries(points)) {
      const k = name === 'chest' || name === 'head' ? 1 : 0.55;
      point.prev.set(point.pos.x - ix * 0.016 * k, point.pos.y - iy * 0.016 * k, point.pos.z - iz * 0.016 * k);
    }
  }

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), skin);
  const torsoMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.42, 4, 10), mat);
  const limbMat = mat;
  function limbMesh(r) {
    return new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, 1, 8), limbMat);
  }
  const armL = limbMesh(0.055);
  const armR = limbMesh(0.055);
  const legL = limbMesh(0.075);
  const legR = limbMesh(0.075);
  group.add(headMesh, torsoMesh, armL, armR, legL, legR);
  scene.add(group);

  function placeCylinder(mesh, a, b) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    mesh.position.copy(mid);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = Math.max(0.05, dir.length());
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  }

  let age = 0;
  let settled = false;

  function step(dt, time) {
    // Clamp long frames so a hitch cannot explode the Verlet solver.
    dt = Math.min(dt, 1 / 30);
    age += dt;
    const dt2 = dt * dt;
    for (const point of Object.values(points)) {
      const vx = (point.pos.x - point.prev.x) * DAMPING;
      const vy = (point.pos.y - point.prev.y) * DAMPING;
      const vz = (point.pos.z - point.prev.z) * DAMPING;
      point.prev.copy(point.pos);
      point.pos.x += vx;
      point.pos.y += vy + GRAVITY * dt2;
      point.pos.z += vz;
      // Ground: rest at the point radius, with friction on contact.
      if (point.pos.y < 0.12) {
        point.pos.y = 0.12;
        point.prev.x = point.pos.x - vx * GROUND_FRICTION;
        point.prev.z = point.pos.z - vz * GROUND_FRICTION;
      }
      // Buildings: push out of their 3D boxes, only below roof height.
      for (const box of colliders) {
        if (point.pos.y > box.height) continue;
        if (point.pos.x > box.minX && point.pos.x < box.maxX && point.pos.z > box.minZ && point.pos.z < box.maxZ) {
          const dxl = point.pos.x - box.minX;
          const dxr = box.maxX - point.pos.x;
          const dzl = point.pos.z - box.minZ;
          const dzr = box.maxZ - point.pos.z;
          const m = Math.min(dxl, dxr, dzl, dzr);
          if (m === dxl) point.pos.x = box.minX;
          else if (m === dxr) point.pos.x = box.maxX;
          else if (m === dzl) point.pos.z = box.minZ;
          else point.pos.z = box.maxZ;
        }
      }
    }
    for (let i = 0; i < ITERATIONS; i += 1) {
      for (const [a, b, rest] of LINKS) {
        const pa = points[a];
        const pb = points[b];
        const dx = pb.pos.x - pa.pos.x;
        const dy = pb.pos.y - pa.pos.y;
        const dz = pb.pos.z - pa.pos.z;
        const d = Math.hypot(dx, dy, dz) || 0.0001;
        const diff = (d - rest) / d;
        const wa = pa.mass / (pa.mass + pb.mass);
        const wb = pb.mass / (pa.mass + pb.mass);
        pa.pos.x += dx * diff * wa;
        pa.pos.y += dy * diff * wa;
        pa.pos.z += dz * diff * wa;
        pb.pos.x -= dx * diff * wb;
        pb.pos.y -= dy * diff * wb;
        pb.pos.z -= dz * diff * wb;
      }
    }
    // Draw the body from the points.
    headMesh.position.copy(points.head.pos);
    placeCylinder(torsoMesh, points.pelvis.pos, points.chest.pos);
    placeCylinder(armL, points.chest.pos, points.handL.pos);
    placeCylinder(armR, points.chest.pos, points.handR.pos);
    placeCylinder(legL, points.pelvis.pos, points.footL.pos);
    placeCylinder(legR, points.pelvis.pos, points.footR.pos);
    // Settled once the body has been near the ground and slow for a while.
    if (!settled && age > 0.9) {
      const chestSpeed = points.chest.pos.distanceTo(points.chest.prev) / Math.max(dt, 0.001);
      if (points.chest.pos.y < 0.6 && chestSpeed < 0.6) settled = true;
    }
    return { age, settled };
  }

  function position() {
    return points.pelvis.pos.clone();
  }

  function dispose() {
    scene.remove(group);
    for (const mesh of [headMesh, torsoMesh, armL, armR, legL, legR]) {
      mesh.geometry.dispose();
    }
    mat.dispose();
    skin.dispose();
  }

  return { step, position, dispose, points };
}
