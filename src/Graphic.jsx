import { useEffect, useRef } from "react";
import * as THREE from "three";
import { DK_PIXEL_COORDS, DK_PIXEL_HEIGHT, DK_PIXEL_WIDTH } from "./geometry/pixel-constants";
import { getPixelShapeGeometry } from "./geometry/pixel";

const CAMERA_DISTANCE = 25;

/**
 * Component managing background visual graphic
 */
const Graphic = () => {
  // Ref for mounting point of scene
  const canvasRef = useRef(null);

  // Note only running effect once
  useEffect(() => {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    // DK pixel
    const geometry = getPixelShapeGeometry(DK_PIXEL_WIDTH, DK_PIXEL_HEIGHT, DK_PIXEL_COORDS, 1);
    const material = new THREE.MeshNormalMaterial();
    const object = new THREE.Mesh(geometry, material);

    scene.add(object);

    const animate = () => {
      requestAnimationFrame(animate);

      // Magic numbers for visual rotation for now
      object.rotateX(-0.004);
      object.rotateY(-0.006);
      object.rotateZ(0.00025);

      renderer.render(scene, camera);
    };

    animate();

    const onWindowResizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onWindowResizeHandler);
  }, []);

  return (
    <div id="visual">
      <canvas id="canvas" ref={canvasRef} />
    </div>
  );
}

export default Graphic;