// Builds the showroom: one long gallery with a living, a bedroom and a dining zone.
import * as THREE from "three";
import { productById, type Product } from "../data/catalog";
import type { RoomKey } from "../lib/designer";
import { armchair, bed, bench, coffeeTables, diningSet, floorLamp, MATERIALS, nightstand, pendant, plant, rug, sideboard, slatWall, sofa } from "./furniture";

export interface Zone {
  key: RoomKey;
  // Product photos hung on this zone's back wall.
  productIds: number[];
  furnish: (zone: THREE.Group) => void;
}

export interface Showroom {
  scene: THREE.Scene;
  // Clickable product photos; each carries its product in userData.
  displays: THREE.Mesh[];
  // Furniture standing on the floor, which visitors can drag and turn.
  movables: THREE.Object3D[];
  // How far from its zone's centre a piece may be dragged.
  floor: { x: number; back: number; front: number };
  zoneCentre: (index: number) => number;
  dispose: () => void;
}

const ZONE_WIDTH = 14;
const DEPTH = 12;
const HEIGHT = 4;
const BACK = -DEPTH / 2;
const DISPLAY_SIZE = 1.9;
const DISPLAY_HEIGHT = 2.15;

const place = (object: THREE.Object3D, x: number, z: number, turn = 0) => {
  object.position.x = x;
  object.position.z = z;
  object.rotation.y = turn;
  return object;
};

export const ZONES: Zone[] = [
  {
    key: "living",
    productIds: [1682, 1865, 2028, 1829],
    furnish: (zone) => zone.add(
      rug(5, 3.4), place(sofa(3), 0, -1.5), place(coffeeTables(), -0.2, 0.3), place(armchair(), -3, 0.2, 0.9),
      place(armchair(), 3, 0.2, -0.9), place(floorLamp(), 2.2, -2.1), place(plant(), -5.6, BACK + 0.8),
    ),
  },
  {
    key: "bedroom",
    productIds: [2002, 2020, 2022, 1975],
    furnish: (zone) => zone.add(
      rug(4.6, 3.6), place(bed(), 0, -1.6), place(nightstand(), -1.5, -2.5), place(nightstand(), 1.5, -2.5),
      place(bench(), 0, 0.1), place(armchair(), 3.4, 0.6, -1), place(plant(), 5.6, BACK + 0.8),
    ),
  },
  {
    key: "dining",
    productIds: [1831, 1850, 1805, 2035],
    furnish: (zone) => {
      const lamp = pendant();
      lamp.position.set(0, HEIGHT, -0.6);
      zone.add(place(rug(4.4, 4.4), 0, -0.6), place(diningSet(), 0, -0.6), place(sideboard(), -4.6, -1.5, Math.PI / 2), place(plant(), 5.6, BACK + 0.8), place(floorLamp(), -5.4, 1.8), lamp);
    },
  },
];

function wall(width: number, height: number, look: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.3), look);
  mesh.position.y = height / 2;
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// A soft pool of light painted on the wall behind each photo.
function lightPoolTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(128, 96, 10, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255, 226, 176, 0.75)");
  gradient.addColorStop(1, "rgba(255, 226, 176, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function display(product: Product, loader: THREE.TextureLoader, pool: THREE.Texture) {
  const texture = loader.load(product.image);
  texture.colorSpace = THREE.SRGBColorSpace;
  // The photo lights itself, so it reads clearly from anywhere in the room.
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(DISPLAY_SIZE, DISPLAY_SIZE), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  photo.userData.product = product;
  photo.position.z = 0.04;

  const frame = new THREE.Mesh(new THREE.BoxGeometry(DISPLAY_SIZE + 0.12, DISPLAY_SIZE + 0.12, 0.06), MATERIALS.dark);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(DISPLAY_SIZE * 2.4, DISPLAY_SIZE * 2.4), new THREE.MeshBasicMaterial({ map: pool, transparent: true, depthWrite: false }));
  glow.position.z = -0.02;

  const group = new THREE.Group();
  group.add(glow, frame, photo);
  return { group, photo };
}

function addArchitecture(scene: THREE.Scene, length: number) {
  const centre = length / 2 - ZONE_WIDTH / 2;
  const plaster = new THREE.MeshStandardMaterial({ color: 0xe9dfd0, roughness: 0.95 });
  const accent = new THREE.MeshStandardMaterial({ color: 0x9a5b45, roughness: 0.9 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(length + 6, DEPTH + 6), new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.32 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.x = centre;
  floor.receiveShadow = true;

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(length + 6, DEPTH + 6), MATERIALS.dark);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centre, HEIGHT, 0);

  const back = wall(length, HEIGHT, plaster);
  back.position.set(centre, HEIGHT / 2, BACK - 0.15);

  scene.add(floor, ceiling, back);

  // End walls are wood slats; the walls between zones stop halfway so the next room shows.
  for (const [x, turn] of [[-ZONE_WIDTH / 2, Math.PI / 2], [length - ZONE_WIDTH / 2, -Math.PI / 2]]) {
    const end = wall(DEPTH, HEIGHT, MATERIALS.dark);
    end.position.x = x;
    end.rotation.y = Math.PI / 2;
    const slats = slatWall(DEPTH, HEIGHT);
    slats.position.x = x + Math.sign(turn) * 0.2;
    slats.rotation.y = turn;
    scene.add(end, slats);
  }
  for (let index = 1; index < ZONES.length; index++) {
    const divider = wall(DEPTH * 0.45, HEIGHT, accent);
    divider.rotation.y = Math.PI / 2;
    divider.position.set(index * ZONE_WIDTH - ZONE_WIDTH / 2, HEIGHT / 2, BACK + DEPTH * 0.225);
    scene.add(divider);
  }
}

function addLights(scene: THREE.Scene, length: number) {
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x4a3a2c, 1.1));

  const sun = new THREE.DirectionalLight(0xfff0dd, 2.2);
  sun.position.set(length / 2 - ZONE_WIDTH / 2 - 6, 9, 8);
  sun.target.position.set(length / 2 - ZONE_WIDTH / 2, 0, -2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -length / 2 - 2, right: length / 2 + 2, top: 10, bottom: -10, near: 1, far: 30 });
  scene.add(sun, sun.target);

  // One warm lamp per zone gives each room its own glow.
  ZONES.forEach((_, index) => {
    const lamp = new THREE.PointLight(0xffc98a, 28, 13, 1.6);
    lamp.position.set(index * ZONE_WIDTH + 2.2, 2.6, -1.6);
    scene.add(lamp);
  });
}

export function buildShowroom(): Showroom {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1d1612);
  scene.fog = new THREE.Fog(0x1d1612, 16, 46);

  const length = ZONES.length * ZONE_WIDTH;
  const loader = new THREE.TextureLoader();
  const pool = lightPoolTexture();
  const displays: THREE.Mesh[] = [];
  const movables: THREE.Object3D[] = [];

  addArchitecture(scene, length);
  addLights(scene, length);

  ZONES.forEach((zone, index) => {
    const room = new THREE.Group();
    room.position.x = index * ZONE_WIDTH;
    zone.furnish(room);
    movables.push(...room.children.filter((piece) => piece instanceof THREE.Group && piece.position.y === 0));

    const products = zone.productIds.map(productById).filter((product): product is Product => Boolean(product));
    const spacing = (ZONE_WIDTH - 2.4) / products.length;
    products.forEach((product, slot) => {
      const { group, photo } = display(product, loader, pool);
      group.position.set((slot - (products.length - 1) / 2) * spacing, DISPLAY_HEIGHT, BACK + 0.05);
      room.add(group);
      displays.push(photo);
    });
    scene.add(room);
  });

  const dispose = () => scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((item) => {
      (item as THREE.MeshBasicMaterial).map?.dispose();
      item.dispose();
    });
  });

  const floor = { x: ZONE_WIDTH / 2 - 0.6, back: BACK + 0.7, front: 3.4 };
  return { scene, displays, movables, floor, zoneCentre: (index) => index * ZONE_WIDTH, dispose };
}
