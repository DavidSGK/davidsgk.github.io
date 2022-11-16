import { useEffect, useRef } from "react";
import * as THREE from "three";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
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
    const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, alpha: true, antialias: true });

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);

    // For now, draw simple icosahedron
    const geometry = new THREE.IcosahedronGeometry(5);
    const material = new THREE.MeshNormalMaterial();
    const object = new THREE.Mesh(geometry, material);

    scene.add(object);
    camera.position.set(0, 0, CAMERA_DISTANCE);

    const animate = () => {
      requestAnimationFrame(animate);
      object.rotateX(-0.01);
      object.rotateY(0.01);
      object.rotateZ(0.01);

      renderer.render(scene, camera);
    };

    animate();

    // TODO: Add resize handling
  }, []);

  return (
    <div id="visual">
      <canvas id="canvas" ref={canvasRef} />
    </div>
  );
}

export default Graphic;