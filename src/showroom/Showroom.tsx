import { keepWheel } from "../lib/motion";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { type Product } from "../data/catalog";
import { cutoutAspect, cutoutOf } from "../data/cutouts";
import { navigate } from "../hooks/useRoute";
import { money } from "../lib/format";
import { useShop } from "../state/ShopContext";
import { buildShowroom, ZONES } from "./scene";
import { productRoute } from "../lib/routes";

const EYE_HEIGHT = 1.75;
// The camera's distance from the room: far when zoomed out, near when zoomed in.
const CAMERA_Z = { far: 5.2, near: 1.2 };
const LOOK_AT: [number, number, number] = [0, 1.35, -3];
const GLIDE_SPEED = 1.6;
const AUTO_TOUR_MS = 9000;
const ZOOM_STEP = 0.25;
// A focused product stands this far in front of its photo, and the camera this far in front of it.
const STAND_OFF = 1.5;
const VIEW_DISTANCE = 3.4;
const BILLBOARD_WIDTH = 2.3;
const ORBIT = { reach: 0.9, periodMs: 2200 };
// Dragging empty space looks around; dragging a focused product walks around it.
const LOOK = { speed: 0.012, x: 6, y: 1.2 };
const WALK = { speed: 0.006, angle: 1.35, near: 0.55, far: 1.5, wheel: 0.001 };
const TURN = { drag: 0.012, wheel: 0.004 };
// A press that moves less than this many pixels is a click, not a drag.
const CLICK_SLOP = 5;
const RIGHT_BUTTON = 2;
// A selected piece can be lifted this high (metres) and moved or turned on every axis.
const MAX_LIFT = 2;

// How the selected piece is changed: moved along any axis, or turned around any axis.
type EditMode = "translate" | "rotate";

// The starting place of each piece, so the visitor can put it back.
interface Rest {
  position: THREE.Vector3;
  rotation: THREE.Euler;
}

// What the visitor is dragging: a piece of furniture (moved or turned) or the view itself.
interface Drag {
  piece: THREE.Object3D | null;
  turning: boolean;
  // Where on the floor the piece was grabbed, relative to its own position.
  grip: THREE.Vector3;
  x: number;
  y: number;
  moved: boolean;
}

interface Hover {
  product: Product;
  x: number;
  y: number;
}

// What the render loop needs to know; kept in a ref so the scene is built only once.
interface View {
  zone: number;
  zoom: number;
  focus: THREE.Mesh | null;
}

// A soft dark ellipse that grounds the standing product on the floor.
function shadowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(30, 20, 12, 0.55)");
  gradient.addColorStop(1, "rgba(30, 20, 12, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

// The 3D showroom canvas: the camera glides between zones, zooms, and flies in to a clicked product.
export default function Showroom() {
  const { t, nameOf } = useShop();
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef<View>({ zone: 0, zoom: 0, focus: null });
  const touched = useRef(false);
  const focusOn = useRef<(photo: THREE.Mesh | null) => void>(() => {});
  const [zone, setZone] = useState(0);
  const [focused, setFocused] = useState<Product | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [failed, setFailed] = useState(false);
  // The selected piece's edit mode, or null when no piece is selected.
  const [editing, setEditing] = useState<EditMode | null>(null);
  const edit = useRef<{ mode: (mode: EditMode) => void; reset: () => void; done: () => void }>({ mode: () => {}, reset: () => {}, done: () => {} });

  const goTo = (index: number, byVisitor = true) => {
    const next = (index + ZONES.length) % ZONES.length;
    view.current.zone = next;
    touched.current ||= byVisitor;
    if (byVisitor) focusOn.current(null);
    setZone(next);
  };

  const zoomBy = (step: number) => {
    touched.current = true;
    view.current.zoom = Math.min(1, Math.max(0, view.current.zoom + step));
  };

  useEffect(() => {
    const host = mount.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      // No WebGL: the still photo behind the canvas stays as the hero.
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const showroom = buildShowroom();
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 80);
    camera.position.set(showroom.zoneCentre(0) - 3, EYE_HEIGHT, CAMERA_Z.far);
    const lookAt = new THREE.Vector3(...LOOK_AT);
    const goal = { position: new THREE.Vector3(), lookAt: new THREE.Vector3() };
    const pointer = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const loader = new THREE.TextureLoader();
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("a11y-still");
    let hovered: THREE.Mesh | null = null;
    let drag: Drag | null = null;
    // The visitor's own view: a look offset in the gallery, and an angle and distance around a focused product.
    const look = { x: 0, y: 0, angle: 0, distance: 1, walked: false };
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const gaze = new THREE.Vector2(0, 0);
    let visible = true;
    let frame = 0;
    let last = performance.now();

    // The focused product: its cutout standing in the room, with a shadow under it.
    const billboard = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    billboard.visible = shadow.visible = false;
    showroom.scene.add(shadow, billboard);

    // Clicking a piece selects it and shows handles to move it along, or turn it around, any axis.
    const transform = new TransformControls(camera, renderer.domElement);
    transform.setSize(0.8);
    showroom.scene.add(transform.getHelper());
    const rest = new Map<THREE.Object3D, Rest>(showroom.movables.map((piece) => [piece, { position: piece.position.clone(), rotation: piece.rotation.clone() }]));
    // The piece stays inside its room and never sinks below the floor.
    transform.addEventListener("objectChange", () => {
      const piece = transform.object;
      if (!piece) return;
      touched.current = true;
      piece.position.set(
        THREE.MathUtils.clamp(piece.position.x, -showroom.floor.x, showroom.floor.x),
        THREE.MathUtils.clamp(piece.position.y, 0, MAX_LIFT),
        THREE.MathUtils.clamp(piece.position.z, showroom.floor.back, showroom.floor.front),
      );
    });
    const select = (piece: THREE.Object3D | null) => {
      // Editing a piece stops the automatic tour, so the room stays put.
      if (piece) touched.current = true;
      if (piece) transform.attach(piece);
      else transform.detach();
      setEditing(piece ? (transform.mode as EditMode) : null);
    };
    edit.current = {
      mode: (mode) => {
        transform.setMode(mode);
        setEditing(mode);
      },
      reset: () => {
        const piece = transform.object;
        const start = piece && rest.get(piece);
        if (!piece || !start) return;
        piece.position.copy(start.position);
        piece.rotation.copy(start.rotation);
      },
      done: () => select(null),
    };

    focusOn.current = (photo) => {
      view.current.focus = photo;
      Object.assign(look, { x: 0, y: 0, angle: 0, distance: 1, walked: false });
      billboard.visible = shadow.visible = false;
      setFocused(photo ? (photo.userData.product as Product) : null);
      if (!photo) return;
      touched.current = true;
      const product = photo.userData.product as Product;
      const cutout = cutoutOf(product);
      // A product without a cutout is simply viewed close up on the wall.
      if (!cutout) return;
      const wall = photo.getWorldPosition(new THREE.Vector3());
      const height = BILLBOARD_WIDTH / cutoutAspect(product);
      const material = billboard.material as THREE.MeshBasicMaterial;
      material.map?.dispose();
      material.map = loader.load(cutout, () => { billboard.visible = shadow.visible = view.current.focus === photo; });
      material.map.colorSpace = THREE.SRGBColorSpace;
      material.needsUpdate = true;
      billboard.scale.set(BILLBOARD_WIDTH, height, 1);
      billboard.position.set(wall.x, height / 2 + 0.02, wall.z + STAND_OFF);
      shadow.scale.set(BILLBOARD_WIDTH * 1.25, 1.1, 1);
      shadow.position.set(wall.x, 0.03, wall.z + STAND_OFF);
    };

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      // Narrow screens need a wider lens to keep the room in view.
      camera.fov = camera.aspect < 1 ? 78 : 58;
      camera.updateProjectionMatrix();
    };

    const aim = (event: MouseEvent) => {
      const box = host.getBoundingClientRect();
      pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return { box, hit: (raycaster.intersectObjects(showroom.displays)[0]?.object as THREE.Mesh | undefined) ?? null };
    };

    // The piece of furniture under the pointer, if any (call after aim).
    const pieceUnderPointer = () => {
      if (view.current.focus) return null;
      let hit: THREE.Object3D | null = raycaster.intersectObjects(showroom.movables)[0]?.object ?? null;
      while (hit && !showroom.movables.includes(hit)) hit = hit.parent;
      return hit;
    };

    // Where the pointer's ray meets the floor, in the piece's room.
    const floorPoint = (piece: THREE.Object3D) => {
      const point = raycaster.ray.intersectPlane(ground, new THREE.Vector3());
      return point && piece.parent!.worldToLocal(point);
    };

    const onPointerDown = (event: PointerEvent) => {
      // A press on the handles belongs to them.
      if (transform.axis || transform.dragging) return;
      const { hit } = aim(event);
      const piece = hit ? null : pieceUnderPointer();
      const grip = (piece && floorPoint(piece)?.sub(piece.position)) || new THREE.Vector3();
      drag = { piece, grip, turning: event.button === RIGHT_BUTTON || event.shiftKey, x: event.clientX, y: event.clientY, moved: false };
      host.setPointerCapture(event.pointerId);
    };

    const onDrag = (event: PointerEvent, held: Drag) => {
      const deltaX = event.clientX - held.x;
      const deltaY = event.clientY - held.y;
      if (!held.moved && Math.hypot(deltaX, deltaY) < CLICK_SLOP) return;
      held.moved = touched.current = true;
      held.x = event.clientX;
      held.y = event.clientY;
      const { piece } = held;
      if (piece && held.turning) {
        piece.rotation.y += deltaX * TURN.drag;
      } else if (piece) {
        const point = floorPoint(piece)?.sub(held.grip);
        if (point) piece.position.set(THREE.MathUtils.clamp(point.x, -showroom.floor.x, showroom.floor.x), piece.position.y, THREE.MathUtils.clamp(point.z, showroom.floor.back, showroom.floor.front));
      } else if (view.current.focus) {
        look.walked = true;
        look.angle = THREE.MathUtils.clamp(look.angle - deltaX * WALK.speed, -WALK.angle, WALK.angle);
        look.y = THREE.MathUtils.clamp(look.y + deltaY * WALK.speed, -0.6, LOOK.y);
      } else {
        look.x = THREE.MathUtils.clamp(look.x - deltaX * LOOK.speed, -LOOK.x, LOOK.x);
        look.y = THREE.MathUtils.clamp(look.y + deltaY * LOOK.speed * 0.4, -LOOK.y, LOOK.y);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      const { box, hit } = aim(event);
      if (drag) return onDrag(event, drag);
      if (transform.dragging) return;
      gaze.copy(pointer);
      hovered = hit;
      host.style.cursor = hovered ? "pointer" : pieceUnderPointer() ? "grab" : "";
      setHover(hovered ? { product: hovered.userData.product, x: event.clientX - box.left, y: event.clientY - box.top } : null);
    };

    const onPointerUp = (event: PointerEvent) => {
      const held = drag;
      drag = null;
      if (!held || held.moved) return;
      // A click on a piece selects it; a click on a photo flies in to it; a click on empty space lets go.
      if (held.piece) return select(held.piece);
      select(null);
      focusOn.current(aim(event).hit);
    };

    // The wheel turns the piece under the pointer and zooms a focused product; elsewhere the page scrolls as usual.
    const onWheel = (event: WheelEvent) => {
      aim(event);
      const piece = pieceUnderPointer();
      if (!piece && !view.current.focus) return;
      keepWheel(event);
      touched.current = true;
      if (piece) piece.rotation.y += event.deltaY * TURN.wheel;
      else look.distance = THREE.MathUtils.clamp(look.distance + event.deltaY * WALK.wheel, WALK.near, WALK.far);
    };

    const setGoal = (now: number) => {
      const { zone: zoneIndex, zoom, focus } = view.current;
      if (focus) {
        const wall = focus.getWorldPosition(new THREE.Vector3());
        // The camera drifts side to side, so the standing product is seen from changing angles.
        const drift = calm || look.walked ? 0 : Math.sin(now / ORBIT.periodMs) * ORBIT.reach;
        const standing = billboard.visible;
        const centreZ = wall.z + (standing ? STAND_OFF : 0);
        const distance = (standing ? VIEW_DISTANCE : 2.6) * look.distance;
        // The visitor's drag walks the camera on a circle around the product.
        goal.position.set(wall.x + drift + Math.sin(look.angle) * distance, (standing ? 1.35 : wall.y) + look.y, centreZ + Math.cos(look.angle) * distance);
        goal.lookAt.set(wall.x, standing ? billboard.position.y : wall.y, centreZ);
        return;
      }
      const centre = showroom.zoneCentre(zoneIndex);
      const sway = calm ? 0 : Math.sin(now / 2600) * 0.12;
      goal.position.set(centre + gaze.x * 1.2 + sway + look.x * 0.5, EYE_HEIGHT + gaze.y * 0.25, CAMERA_Z.far - zoom * (CAMERA_Z.far - CAMERA_Z.near));
      goal.lookAt.set(centre + gaze.x * 2.4 + look.x, LOOK_AT[1] + gaze.y * 0.5 + look.y, LOOK_AT[2]);
    };

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (!visible) return;
      const delta = Math.min((now - last) / 1000, 0.1);
      last = now;

      setGoal(now);
      const ease = calm ? 1 : 1 - Math.exp(-delta * GLIDE_SPEED);
      camera.position.lerp(goal.position, ease);
      lookAt.lerp(goal.lookAt, ease);
      camera.lookAt(lookAt);
      // The standing product always faces the camera.
      billboard.rotation.y = Math.atan2(camera.position.x - billboard.position.x, camera.position.z - billboard.position.z);

      // The photo under the pointer steps forward.
      for (const photo of showroom.displays) {
        const scale = photo === hovered ? 1.06 : 1;
        photo.parent!.scale.lerp(new THREE.Vector3(scale, scale, 1), 0.15);
      }
      renderer.render(showroom.scene, camera);
    };

    const watcher = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    const sizer = new ResizeObserver(resize);
    watcher.observe(host);
    sizer.observe(host);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", () => setHover(null));
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", () => { drag = null; });
    host.addEventListener("wheel", onWheel, { passive: false });
    host.addEventListener("contextmenu", (event) => event.preventDefault());
    resize();
    frame = requestAnimationFrame(render);

    // Until the visitor takes over, the tour walks on by itself.
    const tour = calm ? 0 : window.setInterval(() => {
      if (!touched.current && visible) goTo(view.current.zone + 1, false);
    }, AUTO_TOUR_MS);

    return () => {
      transform.dispose();
      cancelAnimationFrame(frame);
      window.clearInterval(tour);
      watcher.disconnect();
      sizer.disconnect();
      showroom.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  if (failed) return null;

  return (
    <>
      <div className="showroom-canvas" ref={mount} />
      {hover && !focused && (
        <div className="showroom-tip" style={{ left: hover.x, top: hover.y }}>
          <b>{nameOf(hover.product)}</b>
          <span className="price">{money(hover.product.price)}</span>
        </div>
      )}
      {editing && !focused ? (
        <div className="showroom-focus showroom-edit" role="group" aria-label={t.showroomEdit}>
          <span className="muted-light">{editing === "translate" ? t.showroomMoveHint : t.showroomTurnHint}</span>
          <button className="btn small" aria-pressed={editing === "translate"} onClick={() => edit.current.mode("translate")}>{t.showroomMove}</button>
          <button className="btn small" aria-pressed={editing === "rotate"} onClick={() => edit.current.mode("rotate")}>{t.showroomTurn}</button>
          <button className="btn ghost small" onClick={() => edit.current.reset()}>{t.showroomReset}</button>
          <button className="btn gold small" onClick={() => edit.current.done()}>{t.showroomDone}</button>
        </div>
      ) : focused ? (
        <div className="showroom-focus">
          <div>
            <b>{nameOf(focused)}</b>
            <span className="price">{money(focused.price)}</span>
          </div>
          <button className="btn gold small" onClick={() => navigate(productRoute(focused))}>{t.viewProduct}</button>
          <button className="btn ghost small" onClick={() => focusOn.current(null)}>{t.showroomBack}</button>
        </div>
      ) : (
        <nav className="showroom-nav" aria-label={t.showroomNav}>
          <button className="round" onClick={() => goTo(zone - 1)} aria-label={t.showroomPrev}>‹</button>
          {ZONES.map((item, index) => (
            <button className="chip dark" aria-pressed={zone === index} onClick={() => goTo(index)} key={item.key}>{t.rooms[item.key][0]}</button>
          ))}
          <button className="round" onClick={() => goTo(zone + 1)} aria-label={t.showroomNext}>›</button>
          <button className="round" onClick={() => zoomBy(-ZOOM_STEP)} aria-label={t.zoomOut}>−</button>
          <button className="round" onClick={() => zoomBy(ZOOM_STEP)} aria-label={t.zoomIn}>+</button>
        </nav>
      )}
    </>
  );
}
