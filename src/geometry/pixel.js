import * as THREE from "three";
import pixelVertexShader from "../shaders/pixelVertex.glsl";
import pixelFragmentShader from "../shaders/pixelFragment.glsl";
import Alea from 'alea';
import { createNoise3D } from "simplex-noise";
import { HeartSpec, DKSpec, SmileSpec, MusicNoteSpec, ExclamationSpec } from "./pixel-specs";
import { shuffle } from "../utils";

/**
 * Allow using Three.js BufferGeometry to create 3D versions of pixellated text
 * Each "pixel" can be subdivided into cubes, which have 2 triangles per face
 */

const NOISE_FREQUENCY_MULTIPLIER = 0.2;

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
    HEART: 2,
    MUSIC_NOTE: 3,
    EXCLAMATION: 4,
  };
  // For convenience, separate by starting values at 10
  static OtherShapes = {
    PLANET: 10,
  };

  static ShapeSpecs = {
    [PixelObject.Shapes.DK]: DKSpec,
    [PixelObject.Shapes.SMILE]: SmileSpec,
    [PixelObject.Shapes.HEART]: HeartSpec,
    [PixelObject.Shapes.MUSIC_NOTE]: MusicNoteSpec,
    [PixelObject.Shapes.EXCLAMATION]: ExclamationSpec,
  };

  constructor(initialShape, size, transitionSpeed = 1, onFinishTransition = () => { }) {
    super();

    this.transitionSpeed = transitionSpeed;
    this.noise3DGenerator = createNoise3D();

    if (initialShape >= Object.keys(PixelObject.Shapes).length) {
      throw new Error("Initial shape must be a pixel shape.");
    }

    // Match number of vertices to max required
    // NOTE: Currently doesn't consider non-pixel shapes
    this.numVertices = Math.max(...Object.values(PixelObject.ShapeSpecs).map((spec) => 36 * spec.coords.length * spec.resolution * spec.resolution * spec.depth));

    this.shapeSize = size;
    this.geometry = new THREE.BufferGeometry();

    this.material = new THREE.RawShaderMaterial({
      vertexShader: pixelVertexShader,
      fragmentShader: pixelFragmentShader,
      transparent: true,
      // Disable interacting with lights - if we want, we need to add more uniforms
      lights: true,
      uniforms: THREE.UniformsUtils.merge([{
        numVertices: { type: "int", value: this.numVertices },
        // "Used" as in visible and not zeroed because they're not necessary for current shape
        numUsedVertices: { type: "int", value: this.numVertices },
        // Overall time tracked by clock
        time: { type: "1f", value: 0 },
        currentShape: { type: "int", value: initialShape },
        targetShape: { type: "int", value: initialShape },
        // Ongoing progression of a transition, [0, 1] TODO: but what about interruptions?
        transProgress: { type: "1f", value: 0 },
        transEndTime: { type: "1f", value: 0 },
      }, THREE.UniformsLib.lights]),
      defines: {
        INITIAL_HUE: Math.random(),
      },
    });

    this.setGeometryAttributes(initialShape);
    this.setGeometryAttributes(initialShape, true);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);

    this.onFinishTransition = onFinishTransition;
    this.inTransition = false;

    // Seed for any generation that requires deterministic behavior
    // e.g. when target -> current need to look the same
    this.prngSeed = Math.random();
  }

  getCurrentShape() {
    return this.material.uniforms.currentShape.value;
  }

  setTargetShape(shape) {
    // TODO: Handle interruptions
    if (this.inTransition) {
      return;
    }
    // Set target attributes
    this.prngSeed = Math.random();
    this.setGeometryAttributes(shape, true);

    // Update both current and target
    this.material.uniforms.targetShape.value = shape;
    this.inTransition = true;
  }

  /**
   * Should be called whenever the object needs to be updated
   * e.g. an animation tick
   */
  update() {
    const delta = (1 / 240) * this.transitionSpeed;
    this.material.uniforms.time.value += delta;

    // TODO: make this framerate independent
    if (this.inTransition && this.material.uniforms.transProgress.value < 1) {
      this.material.uniforms.transProgress.value = Math.min(this.material.uniforms.transProgress.value + delta, 1);
    } else if (this.inTransition) {
      // Want this to only fire once
      this.finishTransition();
    }
  }

  /**
   * Finish transition between shapes and update "current" attributes from previous target
   */
  finishTransition() {
    this.material.uniforms.currentShape.value = this.material.uniforms.targetShape.value;
    this.setGeometryAttributes(this.material.uniforms.currentShape.value);
    this.material.uniforms.transEndTime.value = this.material.uniforms.time.value;
    this.material.uniforms.transProgress.value = 0;

    this.inTransition = false;
    this.onFinishTransition();
  }

  /**
   * Get attributes for a pixel shape formed of subdivided cubes.
   * These attributes should be used to enable transitions in the shader.
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
      scale: relativeScale,
      coords: pixelCoords,
    } = pixelShapeSpec;

    pixelSize *= relativeScale;
    const cubeSize = pixelSize / pixelResolution;
    // For convenience we start overall shape at "(0, 0, 0)" but offset for center
    const offsetX = pixelSize * (pixelWidth / 2) - (cubeSize / 2);
    const offsetY = pixelSize * (pixelHeight / 2) - (cubeSize / 2);
    const offsetZ = pixelSize * ((cubeDepth / pixelResolution) / 2) - (cubeSize / 2);

    let positions = [];
    let cubeCenterOffsets = [];
    let noises = [];
    // 3D vector of random values to be shared for all vertices in the same cube in [0, 1)
    let cubeRandoms = [];
    let cubeIndices = [];

    let cubeIndex = 0;
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
              cubeIndices.push(cubeIndex);
            }

            cubeIndex++;
          }
        }
      }
    });

    // Pad leftover vertex values
    const numRemaining = this.numVertices - noises.length;
    for (let i = 0; i < numRemaining; i++) {
      positions.push(0, 0, 0);
      cubeCenterOffsets.push(0, 0, 0);
      noises.push(0);
    }
    for (let i = 0; i < numRemaining; i += 36) {
      const randomVec = [Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < 36; j++) {
        cubeRandoms.push(...randomVec);
      }
      cubeIndices.push(...new Array(36).fill(cubeIndex++));
    }

    // Calculate normals
    // Counterclockwise triangle for outward
    let normals = [];
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

    let indices = [...new Array(this.numVertices).keys()];

    if (shuffleCubes) {
      shuffle(cubeIndices, 36);
    }

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
      unitRandom: {
        array: new Float32Array(cubeRandoms),
        itemSize: 3,
      },
      cubeIndex: {
        array: new Float32Array(cubeIndices),
        itemSize: 1,
      },
    };

    this.checkAttributes();

    const numUsedVertices = pixelShapeSpec.coords.length * pixelShapeSpec.resolution * pixelShapeSpec.resolution * pixelShapeSpec.depth;

    return { attributes, numUsedVertices };
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

  getPlanetGeometryAttributes(detail = 3, shuffleTriangles = false) {
    const geodesicGeometry = new THREE.IcosahedronGeometry(this.shapeSize * 3, detail);
    // We want "flat" normals instead of the default normalized ones
    geodesicGeometry.computeVertexNormals();

    const positions = Array.from(geodesicGeometry.getAttribute("position").array);
    // Triangle centers == normals of vertices
    const normals = Array.from(geodesicGeometry.getAttribute("normal").array);

    geodesicGeometry.dispose();

    let numUsedVertices = positions.length / 3;
    const noises = [];
    // Random values to be shared between vertices on the same triangle
    const triangleRandoms = [];
    const triangleIndices = [];
    let triangleIndex = 0;
    for (let i = 0; i < numUsedVertices; i++) {
      noises.push(
        this.noise3DGenerator(
          positions[i] * NOISE_FREQUENCY_MULTIPLIER,
          positions[i + 1] * NOISE_FREQUENCY_MULTIPLIER,
          positions[i + 2] * NOISE_FREQUENCY_MULTIPLIER,
        ) * 0.5 + 0.5
      );
    }
    for (let i = 0; i < numUsedVertices; i += 3) {
      const randomVec = [Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < 3; j++) {
        triangleRandoms.push(...randomVec);
      }
      triangleIndices.push(triangleIndex, triangleIndex, triangleIndex);
      triangleIndex++;
    }

    // Add rings
    const prng = new Alea(this.prngSeed);
    const radii = [this.shapeSize * 5, this.shapeSize * 6, this.shapeSize * 7];
    const maxVertexOffset = 0.2;
    const tilt = Math.PI / 6;
    const ringDensity = 720;

    const ringPositions = [];
    radii.forEach((r, ri) => {
      const thetaOffset = ri * 2 * Math.PI / ringDensity / radii.length;
      for (let i = 0; i < ringDensity; i++) {
        const theta = 2 * Math.PI / ringDensity * i + thetaOffset;
        const triangleCenter = new THREE.Vector3(r * Math.cos(theta) * Math.cos(tilt), r * Math.cos(theta) * Math.sin(tilt), r * Math.sin(theta));
        const randomVec = [Math.random(), Math.random(), Math.random()];

        for (let j = 0; j < 3; j++) {
          const x = triangleCenter.x + maxVertexOffset * (prng() * 2 - 1);
          const y = triangleCenter.y + maxVertexOffset * (prng() * 2 - 1);
          const z = triangleCenter.z + maxVertexOffset * (prng() * 2 - 1);
          ringPositions.push(x, y, z);

          // For now, don't need to care about normals for ring particles
          normals.push(0, 0, 0);
          noises.push(0);
          triangleRandoms.push(...randomVec);
          triangleIndices.push(triangleIndex);
        }
        triangleIndex++;
      }
    });
    positions.push(...ringPositions);

    numUsedVertices = positions.length / 3;

    // Pad attributes for remaining vertices
    const numRemaining = this.numVertices - numUsedVertices;
    for (let i = 0; i < numRemaining; i++) {
      positions.push(0, 0, 0);
      normals.push(0, 0, 0);
      noises.push(0);
    }
    for (let i = 0; i < numRemaining; i += 3) {
      const randomVec = [Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < 3; j++) {
        triangleRandoms.push(...randomVec);
      }
      triangleIndices.push(...new Array(3).fill(triangleIndex++));
    }

    const indices = [...new Array(this.numVertices).keys()];

    if (shuffleTriangles) {
      shuffle(triangleIndices, 3);
    }

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
      noise: {
        array: new Float32Array(noises),
        itemSize: 1,
      },
      unitRandom: {
        array: new Float32Array(triangleRandoms),
        itemSize: 3,
      },
      triangleIndex: {
        array: new Float32Array(triangleIndices),
        itemSize: 1,
      },
    };

    this.checkAttributes(attributes);

    return { attributes, numUsedVertices };
  }

  setGeometryAttributes(shape, isTarget = false) {
    let geometryAttributes;
    let numUsedVertices;
    if (shape < 10) {
      ({ attributes: geometryAttributes, numUsedVertices } = this.getPixelGeometryAttributes(PixelObject.ShapeSpecs[shape], this.shapeSize, true));
    } else if (shape == PixelObject.OtherShapes.PLANET) {
      ({ attributes: geometryAttributes, numUsedVertices } = this.getPlanetGeometryAttributes(6, true));
    } else {
      throw new Error("Invalid shape specified.");
    }

    for (const attr in geometryAttributes) {
      const attrKey = isTarget ? "target" + attr.charAt(0).toUpperCase() + attr.slice(1) : attr;
      this.geometry.setAttribute(attrKey, new THREE.BufferAttribute(geometryAttributes[attr].array, geometryAttributes[attr].itemSize));
      this.geometry.getAttribute(attrKey).needsUpdate = true;
    }
    // Also update used vertex count to allow adjusting transitions and handling leftover vertices
    if (!isTarget) {
      this.material.uniforms.numUsedVertices.value = numUsedVertices;
    } else {
      this.material.uniforms.numUsedVertices.value = Math.max(this.material.uniforms.numUsedVertices.value, numUsedVertices);
    }
  }

  checkAttributes(attributes) {
    // Sanity check for correct lengths
    for (const attr in attributes) {
      if (attributes[attr].array.length / attributes[attr].itemSize !== this.numVertices) {
        throw new Error(`Internal error calculating geometry attribute ${attr}: expected size ${this.numVertices} but got ${attributes[attr].array.length / attributes[attr].itemSize}`);
      }
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
};

export { PixelObject };