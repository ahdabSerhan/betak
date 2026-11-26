// Simple modelled furniture for the 3D showroom. Units are metres; every piece stands on y = 0.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const material = (color: number, roughness = 0.9, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });

export const MATERIALS = {
  boucle: material(0xefe7da, 1),
  linen: material(0xd9cdbb, 1),
  walnut: material(0x6b4127, 0.55),
  oak: material(0xb98d5f, 0.6),
  stone: material(0xe8e2d8, 0.35),
  brass: material(0xb8862b, 0.3, 0.8),
  dark: material(0x1d1612, 0.8),
  leaf: material(0x4f6b3c, 0.8),
  rug: material(0xcdbfa9, 1),
  glow: new THREE.MeshBasicMaterial({ color: 0xffe2b0 }),
};

type Position = [x: number, y: number, z: number];

function shadowed<T extends THREE.Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// A soft-edged box whose position is given by its centre.
function block(size: Position, at: Position, look: THREE.Material, radius = 0.06) {
  const mesh = shadowed(new THREE.Mesh(new RoundedBoxGeometry(...size, 4, Math.min(radius, Math.min(...size) / 2)), look));
  mesh.position.set(...at);
  return mesh;
}

function cylinder(radius: number, height: number, at: Position, look: THREE.Material) {
  const mesh = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 40), look));
  mesh.position.set(...at);
  return mesh;
}

function group(...parts: THREE.Object3D[]) {
  const result = new THREE.Group();
  result.add(...parts);
  return result;
}

export function sofa(width = 2.8) {
  const cushions = width / 3 - 0.08;
  return group(
    block([width, 0.38, 1.05], [0, 0.31, 0], MATERIALS.boucle, 0.14),
    block([width, 0.62, 0.3], [0, 0.66, -0.42], MATERIALS.boucle, 0.14),
    block([0.3, 0.5, 1.05], [-width / 2 + 0.12, 0.55, 0], MATERIALS.boucle, 0.14),
    block([0.3, 0.5, 1.05], [width / 2 - 0.12, 0.55, 0], MATERIALS.boucle, 0.14),
    ...[-1, 0, 1].map((slot) => block([cushions, 0.4, 0.2], [slot * (cushions + 0.06), 0.72, -0.22], MATERIALS.linen, 0.1)),
    block([width - 0.3, 0.12, 0.9], [0, 0.06, 0], MATERIALS.walnut, 0.03),
  );
}

export function armchair() {
  return group(
    block([0.95, 0.36, 0.9], [0, 0.32, 0], MATERIALS.boucle, 0.16),
    block([0.95, 0.55, 0.26], [0, 0.62, -0.34], MATERIALS.boucle, 0.13),
    block([0.24, 0.42, 0.9], [-0.4, 0.5, 0], MATERIALS.boucle, 0.12),
    block([0.24, 0.42, 0.9], [0.4, 0.5, 0], MATERIALS.boucle, 0.12),
    block([0.8, 0.14, 0.75], [0, 0.07, 0], MATERIALS.walnut, 0.03),
  );
}

export function coffeeTables() {
  return group(
    cylinder(0.55, 0.05, [0, 0.4, 0], MATERIALS.stone),
    cylinder(0.4, 0.38, [0, 0.19, 0], MATERIALS.walnut),
    cylinder(0.36, 0.05, [0.75, 0.3, 0.3], MATERIALS.stone),
    cylinder(0.26, 0.28, [0.75, 0.14, 0.3], MATERIALS.walnut),
  );
}

export function rug(width: number, depth: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.02, depth), MATERIALS.rug);
  mesh.position.y = 0.011;
  mesh.receiveShadow = true;
  return mesh;
}

export function bed() {
  return group(
    block([2.0, 0.32, 2.2], [0, 0.2, 0], MATERIALS.linen, 0.08),
    block([1.85, 0.24, 2.05], [0, 0.48, 0.02], MATERIALS.stone, 0.1),
    block([2.2, 1.25, 0.16], [0, 0.72, -1.14], MATERIALS.boucle, 0.08),
    block([0.75, 0.16, 0.45], [-0.48, 0.66, -0.75], MATERIALS.boucle, 0.08),
    block([0.75, 0.16, 0.45], [0.48, 0.66, -0.75], MATERIALS.boucle, 0.08),
    block([1.9, 0.06, 0.9], [0, 0.62, 0.55], MATERIALS.rug, 0.03),
  );
}

export function nightstand() {
  return group(block([0.55, 0.5, 0.45], [0, 0.25, 0], MATERIALS.walnut, 0.03), cylinder(0.07, 0.3, [0, 0.65, 0], MATERIALS.brass), cylinder(0.16, 0.2, [0, 0.9, 0], MATERIALS.glow));
}

export function bench() {
  return group(block([1.5, 0.22, 0.45], [0, 0.4, 0], MATERIALS.boucle, 0.1), block([1.3, 0.3, 0.35], [0, 0.15, 0], MATERIALS.walnut, 0.03));
}

function diningChair() {
  return group(
    block([0.48, 0.1, 0.48], [0, 0.46, 0], MATERIALS.boucle, 0.05),
    block([0.48, 0.5, 0.08], [0, 0.72, -0.21], MATERIALS.boucle, 0.04),
    ...[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => cylinder(0.022, 0.42, [x, 0.21, z], MATERIALS.walnut)),
  );
}

export function diningSet(chairs = 6) {
  const set = group(cylinder(0.95, 0.06, [0, 0.75, 0], MATERIALS.walnut), cylinder(0.3, 0.72, [0, 0.36, 0], MATERIALS.walnut), cylinder(0.5, 0.04, [0, 0.02, 0], MATERIALS.walnut));
  for (let index = 0; index < chairs; index++) {
    const angle = (index / chairs) * Math.PI * 2;
    const chair = diningChair();
    chair.position.set(Math.sin(angle) * 1.3, 0, Math.cos(angle) * 1.3);
    // Each chair faces the table's centre.
    chair.rotation.y = angle + Math.PI;
    set.add(chair);
  }
  return set;
}

export function sideboard(width = 2.4) {
  return group(block([width, 0.6, 0.45], [0, 0.45, 0], MATERIALS.walnut, 0.03), block([width + 0.06, 0.04, 0.5], [0, 0.77, 0], MATERIALS.stone, 0.01), block([width - 0.3, 0.14, 0.35], [0, 0.07, 0], MATERIALS.dark, 0.02));
}

export function plant() {
  const leaves = [0, 1, 2, 3, 4, 5, 6].map((index) => {
    const leaf = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), MATERIALS.leaf));
    const angle = index * 0.9;
    leaf.scale.set(0.45, 2.6, 1);
    leaf.position.set(Math.sin(angle) * 0.2, 1.1 + (index % 3) * 0.18, Math.cos(angle) * 0.2);
    leaf.rotation.set(Math.cos(angle) * 0.5, angle, Math.sin(angle) * 0.5);
    return leaf;
  });
  return group(cylinder(0.24, 0.5, [0, 0.25, 0], MATERIALS.brass), ...leaves);
}

export function floorLamp() {
  return group(cylinder(0.16, 0.03, [0, 0.015, 0], MATERIALS.dark), cylinder(0.015, 1.6, [0, 0.8, 0], MATERIALS.dark), cylinder(0.17, 0.26, [0, 1.62, 0], MATERIALS.glow));
}

export function pendant(drop = 1.3) {
  return group(cylinder(0.008, drop, [0, -drop / 2, 0], MATERIALS.dark), cylinder(0.32, 0.2, [0, -drop - 0.1, 0], MATERIALS.brass), cylinder(0.26, 0.02, [0, -drop - 0.21, 0], MATERIALS.glow));
}

// Vertical wood slats, as a feature wall.
export function slatWall(width: number, height: number) {
  const slats = new THREE.Group();
  for (let x = -width / 2; x <= width / 2; x += 0.14) slats.add(block([0.07, height, 0.05], [x, height / 2, 0], MATERIALS.walnut, 0.01));
  return slats;
}
