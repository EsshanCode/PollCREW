"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createBlindBallotModel } from "./createBlindBallotModel";

export default function BlindBallotModel({
  size = 270,
  showDecorations = true,
  fallback = null,
}: {
  size?: number;
  showDecorations?: boolean;
  fallback?: ReactNode;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 2.1, 9.4);
    camera.lookAt(0, 0.8, 0);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true); // no WebGL (old device or disabled): show the flat mascot instead
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const model = createBlindBallotModel();
    model.position.y = -0.35;
    model.userData.floatingStars.visible = showDecorations;
    scene.add(model);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.05, 48),
      new THREE.ShadowMaterial({ color: 0x17234d, opacity: 0.14 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.04;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight(0xfffbf0, 0x9aa8ce, 2.5));
    const key = new THREE.DirectionalLight(0xffffff, 3.4);
    key.position.set(-4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7b8c, 1.8);
    rim.position.set(5, 2, -3);
    scene.add(rim);

    const pointer = new THREE.Vector2();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const onPointerLeave = () => pointer.set(0, 0);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerleave", onPointerLeave);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const startedAt = performance.now();
    let frame = 0;
    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const targetY = -0.4 + pointer.x * 0.16;
      const targetX = -0.04 - pointer.y * 0.08;
      model.rotation.y += (targetY - model.rotation.y) * 0.045;
      model.rotation.x += (targetX - model.rotation.x) * 0.045;
      if (!reducedMotion) {
        model.position.y = -0.35 + Math.sin(elapsed * 1.6) * 0.06;
        model.userData.ballot.rotation.z =
          -0.11 + Math.sin(elapsed * 1.3) * 0.025;
        model.userData.floatingStars.rotation.z = Math.sin(elapsed) * 0.08;
      }
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerleave", onPointerLeave);
      mount.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((entry) => entry.dispose());
        }
      });
      renderer.dispose();
    };
  }, [showDecorations]);

  if (failed) return <>{fallback}</>;
  return (
    <div
      ref={mountRef}
      className="blindballot-model"
      style={{ width: size, height: size }}
      role="img"
      aria-label="A three-dimensional red, white, and blue ballot box with a checked ballot and privacy seal"
    />
  );
}
