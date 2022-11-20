import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DK_PIXEL_COORDS, DK_PIXEL_HEIGHT, DK_PIXEL_WIDTH } from "./geometry/pixel-constants";
import { PixelObject } from "./geometry/pixel";

const CAMERA_DISTANCE = 25;
const CAMERA_MOVE_STRENGTH = 8;
const BOB_DISTANCE = 0.075;
const BOB_FREQUENCY = 2;

/**
 * Component managing background visual graphic
 * 
 * TODO: Refactor to be more modularized - right now it's a monolithic mess because
 * I'm still figuring things out
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

    // Main pixel shape visual
    const mainObject = new PixelObject(0, 1);

    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 1);

    scene.add(mainObject);
    scene.add(directionalLight);

    // Transition between shapes
    setInterval(() => {
      mainObject.setTargetShape((mainObject.getCurrentShape() + 1) % Object.keys(PixelObject.Shapes).length);
    }, 9000);

    renderer.setAnimationLoop(() => {
      // Bobbing animation
      mainObject.position.y = Math.sin(clock.getElapsedTime() * BOB_FREQUENCY) * BOB_DISTANCE;

      mainObject.update();
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
      const dy = (e.pageY - window.innerHeight / 2) / window.innerHeight * CAMERA_MOVE_STRENGTH * -1;

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