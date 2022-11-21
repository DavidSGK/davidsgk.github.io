import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { PixelObject } from "./geometry/pixel";
import { shuffle } from "./utils";

const TRANSITION_INTERVAL = 8000;
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
  // Setup variables required for rendering
  const graphicsRef = useRef(null);
  const transitionIntervalIdRef = useRef(null);

  // Ref for mounting point of scene
  const canvasRef = useRef(null);
  const [paused, setPaused] = useState(false);

  const shapesRef = useRef({
    shapes: shuffle([PixelObject.Shapes.SMILE, PixelObject.Shapes.SEMICOLON, PixelObject.Shapes.MUSIC_NOTE, PixelObject.OtherShapes.PLANET]).concat(PixelObject.Shapes.DK),
    shapeIndex: 0,
  });

  // Main animation function
  const animate = () => {
    const {
      mainObject,
      renderer,
      scene,
      camera,
      clock,
    } = graphicsRef.current;

    // Bobbing animation
    mainObject.position.y = Math.sin(clock.getElapsedTime() * BOB_FREQUENCY) * BOB_DISTANCE;

    mainObject.update();
    renderer.render(scene, camera);
  }

  // Automatically transition between shapes
  const startTransitions = () => {
    transitionIntervalIdRef.current = setInterval(() => {
      const { mainObject } = graphicsRef.current;
      const { shapes, shapeIndex } = shapesRef.current;

      mainObject.setTargetShape(shapes[shapeIndex]);
      Object.assign(shapesRef.current, { shapeIndex: (shapeIndex + 1) % shapes.length });
    }, TRANSITION_INTERVAL);
  };

  const stopTransitions = () => {
    clearInterval(transitionIntervalIdRef.current);
    transitionIntervalIdRef.current = null;
  };

  // Note only running effect once
  useEffect(() => {
    const clock = new THREE.Clock();
    clock.start();

    // Set up scene, camera, renderer for display
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Main pixel shape visual
    const mainObject = new PixelObject(PixelObject.Shapes.DK, 1, 1);

    const directionalLight = new THREE.DirectionalLight(0xffffff);
    directionalLight.position.set(1, 1, 1);

    scene.add(mainObject);
    scene.add(directionalLight);

    graphicsRef.current = {
      clock,
      scene,
      camera,
      renderer,
      mainObject,
    };

    renderer.setAnimationLoop(animate);

    renderer.getContext().canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      console.log("WebGL context lost");
    }, false);

    renderer.getContext().canvas.addEventListener("webglcontextrestored", (e) => {
      console.log("WebGL context restored");
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

    // TEST PAUSE MECHANISM
    const pauseOnSpace = (e) => {
      if (e.key === " ") {
        setPaused((prevPaused) => !prevPaused);
      }
    };
    window.addEventListener("keyup", pauseOnSpace);

    return () => {
      stopTransitions();

      window.removeEventListener("resize", onWindowResizeHandler);
      window.removeEventListener("mousemove", onWindowMouseMoveHandler);
      window.removeEventListener("keyup", pauseOnSpace);

      mainObject.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const { renderer } = graphicsRef.current;

    if (paused) {
      renderer.setAnimationLoop(null);
      stopTransitions();
    } else {
      renderer.setAnimationLoop(animate);
      startTransitions();
    }
  }, [paused]);

  return (
    <div id="visual">
      <canvas id="canvas" ref={canvasRef} />
    </div>
  );
}

export default Graphic;