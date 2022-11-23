import Alea from "alea";
import { createNoise3D } from "simplex-noise";
import * as THREE from "three";
import { shuffle, calculateNormal } from "../utils";
import AttributeArrayManager from "./attribute-array-manager";
import { PixelShapeSpec } from "./pixel-specs";

export type ShapeAttributeKey =
  | "position"
  | "index"
  | "normal"
  | "cubeCenterOffset"
  | "noise"
  | "unitRandom"
  | "unitIndex";

export type ShapeAttribute = {
  array: Float32Array;
  itemSize: number;
};

export type ShapeAttributes = {
  readonly [key in ShapeAttributeKey]: ShapeAttribute;
};

export type ShapeAttributeBuffers = {
  readonly [key in ShapeAttributeKey]: ArrayBuffer;
};

const NOISE_FREQUENCY_MULTIPLIER = 0.2;
// prettier-ignore
const CUBE_OFFSETS = [
  // Top
  -1, +1, -1,
  -1, +1, +1,
  +1, +1, -1,

  +1, +1, -1,
  -1, +1, +1,
  +1, +1, +1,
  // Bottom
  -1, -1, +1,
  -1, -1, -1,
  +1, -1, -1,

  +1, -1, -1,
  +1, -1, +1,
  -1, -1, +1,
  // Left
  -1, +1, -1,
  -1, -1, -1,
  -1, +1, +1,

  -1, +1, +1,
  -1, -1, -1,
  -1, -1, +1,
  // Right
  +1, -1, -1,
  +1, +1, -1,
  +1, +1, +1,

  +1, +1, +1,
  +1, -1, +1,
  +1, -1, -1,
  // Front
  -1, +1, +1,
  -1, -1, +1,
  +1, +1, +1,

  +1, +1, +1,
  -1, -1, +1,
  +1, -1, +1,
  // Back
  -1, -1, -1,
  -1, +1, -1,
  +1, +1, -1,

  +1, +1, -1,
  +1, -1, -1,
  -1, -1, -1,
];

/**
 * A utility class with methods for calculating the necessary attributes for different types of shapes.
 * Shapes are composed of different types of "units" (e.g. "pixel" shapes are formed of cubes).
 *
 * This class maintains a set of fixed size array buffers for efficient memory usage. One caveat is that
 * the return results of a calculation may be invalidated when another calculation is called. Results
 * should be copied if they need to be preserved.
 */
export default class GeometryCalculator {
  static ATTRIBUTES = [
    "position",
    "index",
    "normal",
    "noise",
    "unitRandom",
    "unitIndex",
    "cubeCenterOffset",
  ];

  // Map of attributes calculated by this class to their respective item sizes
  // e.g. Per vertex, position stores 3 values while index only stores 1
  static ATTRIBUTES_TO_ITEM_SIZES = new Map(
    Object.entries({
      position: 3,
      index: 1,
      normal: 3,
      cubeCenterOffset: 3,
      noise: 1,
      unitRandom: 3,
      unitIndex: 1,
    }),
  );

  private numVertices: number;
  private n3Dg: (x: number, y: number, z: number) => number;
  private rng: () => number;
  private arrayManager: AttributeArrayManager;

  /**
   * @param numVertices total number of vertices to be managed by this calculator
   * @param rngSeed seed to use for deterministic random number and noise generation
   * @param arrayManager optional, pre-allocated buffers to use for populating attribute values
   */
  constructor(
    numVertices: number,
    rngSeed: number,
    arrayManager: AttributeArrayManager = undefined,
  ) {
    this.numVertices = numVertices;
    this.rng = Alea(rngSeed);
    this.n3Dg = createNoise3D(this.rng);

    if (arrayManager !== undefined) {
      this.arrayManager = arrayManager;
    } else {
      this.arrayManager = new AttributeArrayManager(
        this.numVertices,
        GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES,
      );
    }
  }

  getPixelGeometryAttributes = (
    pixelShapeSpec: PixelShapeSpec,
    pixelSize: number,
    shuffleCubes: boolean,
  ): { attributes: ShapeAttributes; numUsedVertices: number } => {
    this.arrayManager.resetAll();

    const {
      width: pixelWidth,
      height: pixelHeight,
      depth: cubeDepth,
      resolution: pixelResolution,
      scale: relativeScale,
      coords: pixelCoords,
    } = pixelShapeSpec;

    const numUsedVertices =
      pixelShapeSpec.coords.length *
      pixelShapeSpec.resolution *
      pixelShapeSpec.resolution *
      pixelShapeSpec.depth *
      36;

    if (numUsedVertices > this.numVertices) {
      throw new Error(
        "Not enough vertices allocated to the geometry calculator for this shape.",
      );
    }

    const scaledSize = pixelSize * relativeScale;
    const cubeSize = scaledSize / pixelResolution;
    // For convenience we start overall shape at "(0, 0, 0)" but offset for center
    const offsetX = scaledSize * (pixelWidth / 2) - cubeSize / 2;
    const offsetY = scaledSize * (pixelHeight / 2) - cubeSize / 2;
    const offsetZ =
      scaledSize * (cubeDepth / pixelResolution / 2) - cubeSize / 2;

    const positions = this.arrayManager.get("position");
    const indices = this.arrayManager.get("index");
    const normals = this.arrayManager.get("normal");
    const cubeCenterOffsets = this.arrayManager.get("cubeCenterOffset");
    const noises = this.arrayManager.get("noise");
    // 3D vector of random values to be shared for all vertices in the same cube in [0, 1)
    const cubeRandoms = this.arrayManager.get("unitRandom");
    const cubeIndices = this.arrayManager.get("unitIndex");

    // Some attributes should NOT start at an offset
    indices.set([...new Array(this.numVertices).keys()]);
    for (let i = 0; i < this.numVertices; i += 36) {
      const randomVec = [Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < 36; j += 1) {
        cubeRandoms.set(randomVec, i * 3 + j * 3);
      }
    }
    for (let i = 0; i < this.numVertices / 36; i += 1) {
      cubeIndices.fill(i, i * 36, i * 36 + 36);
    }

    // Start populating actually used values near the middle of the arrays to the nearest cube
    let startVertexIndex = (this.numVertices - numUsedVertices) / 2;
    startVertexIndex -= startVertexIndex % 36;

    ["position", "cubeCenterOffset", "noise"].forEach((attribute) => {
      this.arrayManager.setOffset(
        attribute,
        startVertexIndex *
          GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES.get(attribute),
      );
    });

    pixelCoords.forEach(([pixelX, pixelY]) => {
      for (let localCubeX = 0; localCubeX < pixelResolution; localCubeX += 1) {
        for (
          let localCubeY = 0;
          localCubeY < pixelResolution;
          localCubeY += 1
        ) {
          for (let cubeZ = 0; cubeZ < cubeDepth; cubeZ += 1) {
            const cubeX = pixelX * pixelResolution + localCubeX;
            const cubeY = pixelY * pixelResolution + localCubeY;
            const cubeCenter = new THREE.Vector3(
              cubeX * cubeSize - offsetX,
              cubeY * cubeSize - offsetY,
              cubeZ * cubeSize - offsetZ,
            );

            this.addCubeAttributes(cubeCenter, cubeSize);
          }
        }
      }
    });

    // Calculate normals
    for (let i = 0; i < positions.length; i += 9) {
      const va = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2],
      );
      const vb = new THREE.Vector3(
        positions[i + 3],
        positions[i + 4],
        positions[i + 5],
      );
      const vc = new THREE.Vector3(
        positions[i + 6],
        positions[i + 7],
        positions[i + 8],
      );

      const normal = calculateNormal(va, vb, vc);

      for (let j = 0; j < 3; j += 1) {
        this.arrayManager.push("normal", normal.x, normal.y, normal.z);
      }
    }

    if (shuffleCubes) {
      shuffle(cubeIndices, 36);
    }

    // Keys are named to be set directly as vertex shader attributes
    const attributes = {
      position: {
        array: positions,
        itemSize: 3,
      },
      index: {
        array: indices,
        itemSize: 1,
      },
      normal: {
        array: normals,
        itemSize: 3,
      },
      noise: {
        array: noises,
        itemSize: 1,
      },
      unitRandom: {
        array: cubeRandoms,
        itemSize: 3,
      },
      unitIndex: {
        array: cubeIndices,
        itemSize: 1,
      },
      cubeCenterOffset: {
        array: cubeCenterOffsets,
        itemSize: 3,
      },
    };

    this.checkAttributes(attributes);

    return { attributes, numUsedVertices };
  };

  /**
   * Attributes for a spherical "planet" with rings
   */
  getPlanetGeometryAttributes = (
    radius: number,
    detail: number,
    numRings: number,
    shuffleTriangles: boolean,
  ): { attributes: ShapeAttributes; numUsedVertices: number } => {
    this.arrayManager.resetAll();

    // Geodesic polyhedron geometry for core vertices
    const geodesicGeometry = new THREE.IcosahedronGeometry(radius, detail);
    // We want "flat" normals instead of the default normalized ones
    geodesicGeometry.computeVertexNormals();

    // Some values for ring calculations
    const ringRadii = [...new Array(numRings).keys()].map(
      (i) => radius * (1.7 + i * 0.3),
    );
    const maxTriangleRadius = 0.2;
    const tilt = Math.PI / 6;
    const ringDensity = 1080;

    const numUsedVertices =
      geodesicGeometry.getAttribute("position").count +
      numRings * ringDensity * 3;

    if (numUsedVertices > this.numVertices) {
      throw new Error(
        "Not enough vertices allocated to the geometry calculator for this shape.",
      );
    }

    const positions = this.arrayManager.get("position");
    const indices = this.arrayManager.get("index");
    const normals = this.arrayManager.get("normal");
    const noises = this.arrayManager.get("noise");
    const triangleRandoms = this.arrayManager.get("unitRandom");
    const triangleIndices = this.arrayManager.get("unitIndex");

    // Some attributes should NOT start at an offset
    indices.set([...new Array(this.numVertices).keys()]);
    for (let i = 0; i < this.numVertices; i += 3) {
      const randomVec = [Math.random(), Math.random(), Math.random()];
      for (let j = 0; j < 3; j += 1) {
        triangleRandoms.set(randomVec, i * 3 + j * 3);
      }
    }
    for (let i = 0; i < this.numVertices / 3; i += 1) {
      triangleIndices.fill(i, i * 3, i * 3 + 3);
    }

    // Start populating actually used values near the middle of the arrays to the nearest cube
    let startVertexIndex = (this.numVertices - numUsedVertices) / 2;
    startVertexIndex -= startVertexIndex % 3;

    ["position", "normal", "noise"].forEach((attribute) => {
      this.arrayManager.setOffset(
        attribute,
        startVertexIndex *
          GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES.get(attribute),
      );
    });

    positions.set(
      geodesicGeometry.getAttribute("position").array,
      startVertexIndex *
        GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES.get("position"),
    );
    this.arrayManager.setOffset(
      "position",
      geodesicGeometry.getAttribute("position").array.length,
      true,
    );
    // Triangle centers == normals of vertices
    normals.set(
      geodesicGeometry.getAttribute("normal").array,
      startVertexIndex *
        GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES.get("normal"),
    );
    this.arrayManager.setOffset(
      "normal",
      geodesicGeometry.getAttribute("normal").array.length,
      true,
    );

    // Don't forget to dispose of used geometries
    geodesicGeometry.dispose();

    // Add rings
    ringRadii.forEach((r, ri) => {
      const thetaOffset = (ri * 2 * Math.PI) / ringDensity / ringRadii.length;
      for (let i = 0; i < ringDensity; i += 1) {
        const theta = ((2 * Math.PI) / ringDensity) * i + thetaOffset;
        const triangleCenter = new THREE.Vector3(
          r * Math.cos(theta) * Math.cos(tilt),
          r * Math.cos(theta) * Math.sin(tilt),
          r * Math.sin(theta),
        );

        const triangleVertices = [
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
        ];

        for (const v of triangleVertices) {
          v.x = triangleCenter.x + maxTriangleRadius * (this.rng() * 2 - 1);
          v.y = triangleCenter.y + maxTriangleRadius * (this.rng() * 2 - 1);
          v.z = triangleCenter.z + maxTriangleRadius * (this.rng() * 2 - 1);

          this.arrayManager.push("position", v.x, v.y, v.z);
        }
        const normal = calculateNormal(
          triangleVertices[0],
          triangleVertices[1],
          triangleVertices[2],
        );
        for (let j = 0; j < triangleVertices.length; j += 1) {
          this.arrayManager.push("normal", normal.x, normal.y, normal.z);
        }
      }
    });

    // Add noise for both planet and rings
    for (let i = 0; i < numUsedVertices; i += 1) {
      this.arrayManager.push(
        "noise",
        this.n3Dg(
          positions[i] * NOISE_FREQUENCY_MULTIPLIER,
          positions[i + 1] * NOISE_FREQUENCY_MULTIPLIER,
          positions[i + 2] * NOISE_FREQUENCY_MULTIPLIER,
        ) *
          0.5 +
          0.5,
      );
    }

    if (shuffleTriangles) {
      shuffle(triangleIndices, 3);
    }

    const attributes = {
      position: {
        array: positions,
        itemSize: 3,
      },
      index: {
        array: indices,
        itemSize: 1,
      },
      normal: {
        array: normals,
        itemSize: 3,
      },
      noise: {
        array: noises,
        itemSize: 1,
      },
      unitRandom: {
        array: triangleRandoms,
        itemSize: 3,
      },
      unitIndex: {
        array: triangleIndices,
        itemSize: 1,
      },
      // Not used for this shape
      cubeCenterOffset: {
        array: this.arrayManager.get("cubeCenterOffset"),
        itemSize: 3,
      },
    };

    this.checkAttributes(attributes);

    return { attributes, numUsedVertices };
  };

  private addCubeAttributes = (center: THREE.Vector3, size: number): void => {
    const offset = size / 2;

    for (let i = 0; i < CUBE_OFFSETS.length; i += 3) {
      const offsets = [
        CUBE_OFFSETS[i] * offset,
        CUBE_OFFSETS[i + 1] * offset,
        CUBE_OFFSETS[i + 2] * offset,
      ];
      this.arrayManager.push("cubeCenterOffset", ...offsets);
      const x = center.x + offsets[0];
      const y = center.y + offsets[1];
      const z = center.z + offsets[2];
      this.arrayManager.push("position", x, y, z);

      // Clamp noise to [0, 1]
      this.arrayManager.push(
        "noise",
        this.n3Dg(
          x * NOISE_FREQUENCY_MULTIPLIER,
          y * NOISE_FREQUENCY_MULTIPLIER,
          z * NOISE_FREQUENCY_MULTIPLIER,
        ) *
          0.5 +
          0.5,
      );
    }
  };

  setSeed = (rngSeed: number): void => {
    this.rng = Alea(rngSeed);
    this.n3Dg = createNoise3D(this.rng);
  };

  private checkAttributes = (attributes: ShapeAttributes): void => {
    // Sanity check for correct lengths
    Object.keys(attributes).forEach((attrKey) => {
      const actualSize =
        attributes[attrKey].array.length / attributes[attrKey].itemSize;
      if (actualSize !== this.numVertices) {
        throw new Error(
          `Internal error calculating geometry attribute ${attrKey}: expected size ${this.numVertices} but got ${actualSize}`,
        );
      }
    });
  };
}
