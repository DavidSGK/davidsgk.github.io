import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DK_PIXEL_COORDS, DK_PIXEL_HEIGHT, DK_PIXEL_WIDTH } from "./geometry/pixel-constants";
import { getPixelShapeGeometry } from "./geometry/pixel";

const CAMERA_DISTANCE = 25;
const CAMERA_MOVE_STRENGTH = 4;
const BOB_DISTANCE = 0.075;
const BOB_FREQUENCY = 2;

/**
 * Component managing background visual graphic
 */
const Graphic = () => {
  // Ref for mounting point of scene
  const canvasRef = useRef(null);

  // Note only running effect once
  useEffect(() => {
    // Set up scene, camera, renderer for display
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    const clock = new THREE.Clock();
    clock.start();

    // DK pixel
    const geometry = getPixelShapeGeometry(DK_PIXEL_WIDTH, DK_PIXEL_HEIGHT, DK_PIXEL_COORDS, 1);
    // TODO: Shader here?
    const material = new THREE.MeshNormalMaterial();
    const object = new THREE.Mesh(geometry, material);

    scene.add(object);

    // Some initial animation state
    let drawnIndices = 0;
    geometry.setDrawRange(0, drawnIndices);

    renderer.setAnimationLoop(() => {
      // Initial loading animation
      if (drawnIndices <= geometry.getIndex().array.length) {
        geometry.setDrawRange(0, drawnIndices);
        drawnIndices += 256;
      }
      geometry.setDrawRange(0, drawnIndices);

      // Bobbing animation
      object.position.y = Math.sin(clock.getElapsedTime() * BOB_FREQUENCY) * BOB_DISTANCE;

      renderer.render(scene, camera);
    });

    // On resize, update sizes and aspect ratios
    const onWindowResizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    // On mouse move, skew view a little bit
    const onWindowMouseMoveHandler = (e) => {
      // Distance from window center, clamped
      const dx = (e.pageX - window.innerWidth / 2) / window.innerWidth * CAMERA_MOVE_STRENGTH;
      const dy = (e.pageY - window.innerHeight / 2) / window.innerHeight * CAMERA_MOVE_STRENGTH;

      // TODO: Could probably improve by determining new pos based on rotation matrix
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, dx, 0.1);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, dy, 0.1);
      // Always look at center
      camera.lookAt(new THREE.Vector3(0, 0, 0));
    };

    window.addEventListener("resize", onWindowResizeHandler);
    window.addEventListener("mousemove", onWindowMouseMoveHandler);
  }, []);

  return (
    <div id="visual">
      <canvas id="canvas" ref={canvasRef} />
    </div>
  );
}

export default Graphic;