import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// How far the camera stands, as a multiple of the model's size.
const VIEW_DISTANCE = 1.15;
const SPIN_SPEED = 0.8;

// A product's 3D model: drag to turn it all the way round, scroll or pinch to zoom.
export default function Model3D({ src, label }: { src: string; label: string }) {
  const mount = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = mount.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const scene = new THREE.Scene();
    // Soft studio light from every side, so the back of the piece is lit as well as the front.
    const studio = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = studio;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    // The model turns slowly by itself until the visitor takes hold of it.
    controls.autoRotate = true;
    controls.autoRotateSpeed = SPIN_SPEED;
    controls.addEventListener("start", () => { controls.autoRotate = false; });

    new GLTFLoader().load(src, (gltf) => {
      const model = gltf.scene;
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length();
      // Centred on the origin, so it turns around its own middle.
      model.position.sub(box.getCenter(new THREE.Vector3()));
      scene.add(model);
      camera.position.set(size * 0.45, size * 0.4, size * VIEW_DISTANCE);
      controls.minDistance = size * 0.5;
      controls.maxDistance = size * 2.5;
      controls.update();
    }, undefined, () => setFailed(true));

    const resize = () => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(host);
    resize();

    let frame = 0;
    const render = () => {
      frame = requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      sizer.disconnect();
      controls.dispose();
      studio.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  if (failed) return null;
  return <div className="model-3d" ref={mount} role="img" aria-label={label} />;
}
