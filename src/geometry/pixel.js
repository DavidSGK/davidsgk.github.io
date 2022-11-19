import * as THREE from "three";
import pixelVertexShader from "../shaders/pixelVertex.glsl";
import pixelFragmentShader from "../shaders/pixelFragment.glsl";
import { createNoise3D } from "simplex-noise";
import { CubeSpec, DKSpec, SmileSpec } from "./pixel-constants";

/**
 * Allow using Three.js BufferGeometry to create 3D versions of pixellated text
 * Each "pixel" can be subdivided into cubes, which have 2 triangles per face
 */

const NOISE_FREQUENCY_MULTIPLIER = 0.2;
// Somewhat reasonable number of vertices - allows ~80k triangles
const NUM_VERTICES = 36 * Math.pow(4, 3) * 10 * 10;

/**
 * Extension of Object3D to more easily manage a pixel shape geometry/material
 * for things like specific animations.
 * 
 * Is set up to allow transitiong to some "idle" shapes and "target" shapes.
 * These shapes may or may not be pixel shapes.
 * Animations are handled by the vertex shader for the material.
 */
class PixelObject extends THREE.Object3D {
  static Shapes = {
    DK: 0,
    SMILE: 1,
    CUBE: 2,
  };
  static ShapeSpecs = {
    [PixelObject.Shapes.DK]: DKSpec,
    [PixelObject.Shapes.SMILE]: SmileSpec,
    [PixelObject.Shapes.CUBE]: CubeSpec,
  };

  constructor(initialShape, size, onFinishTransition = () => { }) {
    super();

    this.clock = new THREE.Clock();
    this.noise3DGenerator = createNoise3D();

    if (initialShape >= Object.keys(PixelObject.Shapes).length) {
      throw new Error("Initial shape must be a pixel shape.");
    }

    this.numVertices = NUM_VERTICES;
    if (this.numVertices % 3 !== 0) {
      throw new Error("Number of vertices must be divisible by 3.");
    }

    this.shapeSize = size;
    this.geometry = new THREE.BufferGeometry();
    this.setGeometryAttributes(initialShape);
    this.setGeometryAttributes(initialShape, true);

    this.material = new THREE.RawShaderMaterial({
      vertexShader: pixelVertexShader,
      fragmentShader: pixelFragmentShader,
      transparent: true,
      // Disable interacting with lights - if we want, we need to add more uniforms
      lights: true,
      uniforms: THREE.UniformsUtils.merge([{
        // Overall time tracked by clock
        time: { type: "1f", value: 0 },
        currentShape: { type: "int", value: initialShape },
        targetShape: { type: "int", value: initialShape },
        // Ongoing progression of a transition, [0, 1] TODO: but what about interruptions?
        transProgress: { type: "1f", value: 1 },
      }, THREE.UniformsLib.lights]),
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);

    this.onFinishTransition = onFinishTransition;
    this.inTransition = false;
  }

  getCurrentShape() {
    return this.material.uniforms.currentShape.value;
  }

  setTargetShape(shape) {
    // Set target attributes
    this.setGeometryAttributes(shape, true);

    // Update both current and target
    this.material.uniforms.targetShape.value = shape;
    // TODO: Handle interruptions
    this.material.uniforms.transProgress.value = 0;
    this.inTransition = true;
  }

  /**
   * Should be called whenever the object needs to be updated
   * e.g. an animation tick
   */
  update() {
    this.material.uniforms.time.value += this.clock.getDelta();

    if (this.inTransition && this.material.uniforms.transProgress.value < 1) {
      this.material.uniforms.transProgress.value = Math.min(this.material.uniforms.transProgress.value + 0.01, 1);
    } else if (this.inTransition) {
      // Want this to only fire once
      this.finishTransition();
    }
  }

  /**
   * Finish transition between shapes and update "current" attributes
   */
  finishTransition() {
    this.material.uniforms.currentShape.value = this.material.uniforms.targetShape.value;
    this.setGeometryAttributes(this.material.uniforms.currentShape.value);

    this.inTransition = false;
    this.onFinishTransition();
  }

  /**
   * Get a BufferGeometry object formed of subdivided cubes for a specified pixel shape.
   * 
   * @param {*} pixelWidth width of overall shape in number of pixels
   * @param {*} pixelHeight height of overall shape in number of pixels
   * @param {*} cubeDepth depth of overall shape in number of CUBES, NOT PIXELS
   * @param {*} pixelResolution how many cubes a pixel should be subdivided to
   * @param {*} pixelCoords 2D array of 2D "pixel coordinates"
   * @param {*} pixelSize how long each side of a pixel should be
   * @param {*} shuffleCubes whether to shuffle the order of cubes
   */
  getPixelGeometryAttributes(pixelShapeSpec, pixelSize, shuffleCubes) {
    const {
      width: pixelWidth,
      height: pixelHeight,
      depth: cubeDepth,
      resolution: pixelResolution,
      coords: pixelCoords,
    } = pixelShapeSpec;

    const cubeSize = pixelSize / pixelResolution;
    // For convenience we start overall shape at "(0, 0, 0)" but offset for center
    const offsetX = pixelSize * (pixelWidth / 2) - (cubeSize / 2);
    const offsetY = pixelSize * (pixelHeight / 2) - (cubeSize / 2);
    const offsetZ = pixelSize * ((cubeDepth / pixelResolution) / 2) - (cubeSize / 2);

    const positions = [];
    const cubeCenterOffsets = [];
    const noises = [];
    // 3D vector of random values to be shared for all vertices in the same cube in [0, 1)
    const cubeRandoms = [];

    pixelCoords.forEach(([pixelX, pixelY]) => {
      for (let localCubeX = 0; localCubeX < pixelResolution; localCubeX++) {
        for (let localCubeY = 0; localCubeY < pixelResolution; localCubeY++) {
          for (let cubeZ = 0; cubeZ < cubeDepth; cubeZ++) {
            const cubeX = pixelX * pixelResolution + localCubeX;
            const cubeY = pixelY * pixelResolution + localCubeY;
            const cubeCenter = new THREE.Vector3(
              cubeX * cubeSize - offsetX,
              cubeY * cubeSize - offsetY,
              cubeZ * cubeSize - offsetZ,
            );

            const { vertexPositions, centerOffsets, vertexNoises } = this.getCubeAttributes(cubeCenter, cubeSize);

            positions.push(...vertexPositions);
            cubeCenterOffsets.push(...centerOffsets);
            noises.push(...vertexNoises);

            const randomVec = [Math.random(), Math.random(), Math.random()];
            for (let i = 0; i < 36; i++) {  // 36 vertices per cube
              cubeRandoms.push(...randomVec);
            }
          }
        }
      }
    });

    // Pad leftover vertex values
    for (let i = 0; i < this.numVertices - noises.length; i++) {
      positions.push(0, 0, 0);
      cubeCenterOffsets.push(0, 0, 0);
      noises.push(0);
      cubeRandoms.push(0, 0, 0);
    }

    // Calculate normals
    const normals = [];
    for (let i = 0; i < positions.length; i += 9) {
      const va = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const vb = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const vc = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

      const vcb = new THREE.Vector3().subVectors(vc, vb);
      const vab = new THREE.Vector3().subVectors(va, vb);
      vcb.cross(vab);
      vcb.normalize();

      for (let j = 0; j < 3; j++) {
        normals.push(vcb.x, vcb.y, vcb.z);
      }
    }

    const indices = [...new Array(this.numVertices).keys()];

    // Keys are named to be set directly as vertex shader attributes
    const attributes = {
      position: {
        array: new Float32Array(positions),
        itemSize: 3,
      },
      index: {
        array: new Float32Array(indices),
        itemSize: 1,
      },
      normal: {
        array: new Float32Array(normals),
        itemSize: 3,
      },
      cubeCenterOffset: {
        array: new Float32Array(cubeCenterOffsets),
        itemSize: 3,
      },
      noise: {
        array: new Float32Array(noises),
        itemSize: 1,
      },
      cubeRandom: {
        array: new Float32Array(cubeRandoms),
        itemSize: 3,
      },
    };

    return attributes;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(indices);
    // Note that normal computation is based on counterclockwise specification of vertices for "out"
    geometry.computeVertexNormals();

    // Add custom attributes for animation purposes
    // Ideally, we add information here so that shaders can animate without doing as much math per vertex/pixel
    geometry.setAttribute("cubeCenterOffset", new THREE.BufferAttribute(new Float32Array(cubeCenterOffsets), 3));
    geometry.setAttribute("noise", new THREE.BufferAttribute(new Float32Array(noises), 1));
    geometry.setAttribute("cubeRandom", new THREE.BufferAttribute(new Float32Array(cubeRandoms), 3));

    // TODO: shader needs to be able to differentiate between animating in triangles vs cubes

    return geometry;
  }

  /**
   * Get atributes for cube of a specific size and center position.
   * Note there are 2 triangles per face and thus there are shared points.
   * Also note the order of faces is important.
   * Returns {
   *   vertexPositions: flat array of vertex coordinates in the cube, size 108
   *   centerOffsets: flat array representing offsets of vertices on the cube from the center, size 108
   *                  i.e. center vec + offset vec = vertex vec
   *   vertexNoises: simplex 3D noise value based on vertex position for randomness in [0, 1], size 36
   * }
   * @param {*} center
   * @param {*} size
   */
  getCubeAttributes(center, size) {
    const offset = size / 2;

    // Coords need to be specified counterclockwise for correct normals
    const offsets = [
      // Top
      -offset, +offset, -offset,
      -offset, +offset, +offset,
      +offset, +offset, -offset,

      +offset, +offset, -offset,
      -offset, +offset, +offset,
      +offset, +offset, +offset,
      // Bottom
      -offset, -offset, +offset,
      -offset, -offset, -offset,
      +offset, -offset, -offset,

      +offset, -offset, -offset,
      +offset, -offset, +offset,
      -offset, -offset, +offset,
      // Left
      -offset, +offset, -offset,
      -offset, -offset, -offset,
      -offset, +offset, +offset,

      -offset, +offset, +offset,
      -offset, -offset, -offset,
      -offset, -offset, +offset,
      // Right
      +offset, -offset, -offset,
      +offset, +offset, -offset,
      +offset, +offset, +offset,

      +offset, +offset, +offset,
      +offset, -offset, +offset,
      +offset, -offset, -offset,
      // Front
      -offset, +offset, +offset,
      -offset, -offset, +offset,
      +offset, +offset, +offset,

      +offset, +offset, +offset,
      -offset, -offset, +offset,
      +offset, -offset, +offset,
      // Back
      -offset, -offset, -offset,
      -offset, +offset, -offset,
      +offset, +offset, -offset,

      +offset, +offset, -offset,
      +offset, -offset, -offset,
      -offset, -offset, -offset,
    ]

    const vertexPositions = [];
    const vertexNoises = [];
    for (let i = 0; i < offsets.length; i += 3) {
      const x = center.x + offsets[i];
      const y = center.y + offsets[i + 1];
      const z = center.z + offsets[i + 2];
      vertexPositions.push(x, y, z);
      // Clamp noise to [0, 1]
      vertexNoises.push(
        this.noise3DGenerator(
          x * NOISE_FREQUENCY_MULTIPLIER,
          y * NOISE_FREQUENCY_MULTIPLIER,
          z * NOISE_FREQUENCY_MULTIPLIER
        ) * 0.5 + 0.5
      );
    }

    return { vertexPositions, centerOffsets: offsets, vertexNoises };
  }

  setGeometryAttributes(shape, isTarget = false) {
    const geometryAttributes = this.getPixelGeometryAttributes(PixelObject.ShapeSpecs[shape], this.shapeSize, true);
    for (const attr in geometryAttributes) {
      const attrKey = isTarget ? "target" + attr.charAt(0).toUpperCase() + attr.slice(1) : attr;
      this.geometry.setAttribute(attrKey, new THREE.BufferAttribute(geometryAttributes[attr].array, geometryAttributes[attr].itemSize));
      this.geometry.getAttribute(attrKey).needsUpdate = true;
    }
  }
};

export { PixelObject };