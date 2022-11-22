import * as THREE from 'three';
import { shuffle } from '../utils';

interface ShapeAttribute {
  array: Float32Array,
  itemSize: number,
};

interface ShapeAttributes {
  readonly [key: string]: ShapeAttribute,
};

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
 */
export default class GeometryCalculator {
  numVertices: number;
  n3Dg: (x: number, y: number, z: number) => number;
  rng: () => number;

  /**
   * @param {number} numVertices total number of vertices to be managed by this calculator
   */
  constructor(numVertices: number, n3Dg: (x: number, y: number, z: number) => number, rng: () => number) {
    this.numVertices = numVertices;
    this.n3Dg = n3Dg;
    this.rng = rng;
  }

  getPixelGeometryAttributes = (pixelShapeSpec, pixelSize: number, shuffleCubes: boolean): { attributes: ShapeAttributes, numUsedVertices: number } => {
    // TODO: Convert shape spec to TS
    const {
      width: pixelWidth,
      height: pixelHeight,
      depth: cubeDepth,
      resolution: pixelResolution,
      scale: relativeScale,
      coords: pixelCoords,
    }: {
      width: number,
      height: number,
      depth: number,
      resolution: number,
      scale: number,
      coords: [number, number][],
    } = pixelShapeSpec;

    const numUsedVertices = pixelShapeSpec.coords.length * pixelShapeSpec.resolution * pixelShapeSpec.resolution * pixelShapeSpec.depth * 36;

    pixelSize *= relativeScale;
    const cubeSize = pixelSize / pixelResolution;
    // For convenience we start overall shape at "(0, 0, 0)" but offset for center
    const offsetX = pixelSize * (pixelWidth / 2) - (cubeSize / 2);
    const offsetY = pixelSize * (pixelHeight / 2) - (cubeSize / 2);
    const offsetZ = pixelSize * ((cubeDepth / pixelResolution) / 2) - (cubeSize / 2);

    let positions: number[] = [];
    let cubeCenterOffsets: number[] = [];
    let noises: number[] = [];
    // 3D vector of random values to be shared for all vertices in the same cube in [0, 1)
    let cubeRandoms: number[] = [];

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

            this.addCubeAttributes(cubeCenter, cubeSize, positions, cubeCenterOffsets, noises);

            const randomVec = [Math.random(), Math.random(), Math.random()];
            for (let i = 0; i < 36; i++) {  // 36 vertices per cube
              cubeRandoms.push(...randomVec);
            }
          }
        }
      }
    });

    // Pad leftover vertex values to front and back (keep used values centered)
    const numRemaining = this.numVertices - numUsedVertices;
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
    }
    positions = this.balanceBatches(positions, numUsedVertices * 3, 108);
    cubeCenterOffsets = this.balanceBatches(cubeCenterOffsets, numUsedVertices * 3, 108);
    noises = this.balanceBatches(noises, numUsedVertices, 36);
    cubeRandoms = this.balanceBatches(cubeRandoms, numUsedVertices * 3, 108);

    // Calculate normals
    const normals: number[] = [];
    for (let i = 0; i < positions.length; i += 9) {
      const va = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);
      const vb = new THREE.Vector3(positions[i + 3], positions[i + 4], positions[i + 5]);
      const vc = new THREE.Vector3(positions[i + 6], positions[i + 7], positions[i + 8]);

      const normal = this.calculateNormal(va, vb, vc);

      for (let j = 0; j < 3; j++) {
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    let indices = [...new Array(this.numVertices).keys()];

    const cubeIndices: number[] = new Array(this.numVertices);
    for (let i = 0; i < this.numVertices / 36; i++) {
      cubeIndices.fill(i, i * 36, i * 36 + 36);
    }
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
      unitIndex: {
        array: new Float32Array(cubeIndices),
        itemSize: 1,
      },
    };

    this.checkAttributes(attributes);

    return { attributes, numUsedVertices };
  };

  getPlanetGeometryAttributes = (radius: number, detail: number, shuffleTriangles: boolean): { attributes: ShapeAttributes, numUsedVertices: number } => {
    const geodesicGeometry = new THREE.IcosahedronGeometry(radius, detail);
    // We want "flat" normals instead of the default normalized ones
    geodesicGeometry.computeVertexNormals();

    let positions: number[] = Array.from(geodesicGeometry.getAttribute("position").array);
    // Triangle centers == normals of vertices
    let normals: number[] = Array.from(geodesicGeometry.getAttribute("normal").array);

    geodesicGeometry.dispose();

    let numUsedVertices = positions.length / 3;

    let noises: number[] = [];
    // Random values to be shared between vertices on the same triangle
    let triangleRandoms: number[] = [];
    let triangleIndices: number[] = [];
    let triangleIndex = 0;
    for (let i = 0; i < numUsedVertices; i++) {
      noises.push(
        this.n3Dg(
          positions[i],
          positions[i + 1],
          positions[i + 2],
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
    const radii = [radius * 1.7, radius * 2, radius * 2.3];
    const maxVertexOffset = 0.2;
    const tilt = Math.PI / 6;
    const ringDensity = 1080;

    const ringPositions: number[] = [];
    radii.forEach((r, ri) => {
      const thetaOffset = ri * 2 * Math.PI / ringDensity / radii.length;
      for (let i = 0; i < ringDensity; i++) {
        const theta = 2 * Math.PI / ringDensity * i + thetaOffset;
        const triangleCenter = new THREE.Vector3(r * Math.cos(theta) * Math.cos(tilt), r * Math.cos(theta) * Math.sin(tilt), r * Math.sin(theta));
        const randomVec = [Math.random(), Math.random(), Math.random()];

        const vertices = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
        vertices.forEach((v) => {
          v.x = triangleCenter.x + maxVertexOffset * (this.rng() * 2 - 1);
          v.y = triangleCenter.y + maxVertexOffset * (this.rng() * 2 - 1);
          v.z = triangleCenter.z + maxVertexOffset * (this.rng() * 2 - 1);
          ringPositions.push(v.x, v.y, v.z);

          noises.push(0);
          triangleRandoms.push(...randomVec);
          triangleIndices.push(triangleIndex);
        });
        const normal = this.calculateNormal(vertices[0], vertices[1], vertices[2]);
        vertices.forEach(() => {
          normals.push(normal.x, normal.y, normal.z);
        });
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

    positions = this.balanceBatches(positions, numUsedVertices * 3, 9);
    normals = this.balanceBatches(normals, numUsedVertices * 3, 9);
    noises = this.balanceBatches(noises, numUsedVertices, 3);
    triangleRandoms = this.balanceBatches(triangleRandoms, numUsedVertices * 3, 9);
    triangleIndices = this.balanceBatches(triangleIndices, numUsedVertices, 3);

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
      unitIndex: {
        array: new Float32Array(triangleIndices),
        itemSize: 1,
      },
    };

    this.checkAttributes(attributes);

    return { attributes, numUsedVertices };
  };

  private addCubeAttributes = (center: THREE.Vector3, size: number, positions: number[], centerOffsets: number[], noises: number[]): void => {
    const offset = size / 2;

    for (let i = 0; i < CUBE_OFFSETS.length; i += 3) {
      const offsets = [CUBE_OFFSETS[i] * offset, CUBE_OFFSETS[i + 1] * offset, CUBE_OFFSETS[i + 2] * offset];
      centerOffsets.push(...offsets);
      const x = center.x + offsets[0];
      const y = center.y + offsets[1];
      const z = center.z + offsets[2];
      positions.push(x, y, z);

      // Clamp noise to [0, 1]
      noises.push(this.n3Dg(x, y, z) * 0.5 + 0.5);
    }
  };

  /**
   * Return a "balanced" array by shifting batches of elements from the back to the front
   */
  private balanceBatches = (a: any[], start: number, batchSize: number): typeof a => {
    let mid = Math.floor((a.length - start) / 2);
    mid -= mid % batchSize;
    const balanced: typeof a = [];
    a.slice(start + mid).forEach((x) => { balanced.push(x) });
    a.slice(0, start).forEach((x) => { balanced.push(x) });
    a.slice(start, start + mid).forEach((x) => { balanced.push(x) });

    return balanced;
  };

  /**
   * Calculate the normal of a triangle formed by va, vb, vc
   * assuming they are provided in counterclockwise order (for an outwards normal)
   */
  private calculateNormal = (va: THREE.Vector3, vb: THREE.Vector3, vc: THREE.Vector3): THREE.Vector3 => {
    const vcb = new THREE.Vector3().subVectors(vc, vb);
    const vab = new THREE.Vector3().subVectors(va, vb);
    vcb.cross(vab);
    vcb.normalize();

    return vcb;
  };


  private checkAttributes = (attributes: ShapeAttributes): void => {
    // Sanity check for correct lengths
    for (const attrKey in attributes) {
      const haha = attributes[attrKey];
      const actualSize = attributes[attrKey].array.length / attributes[attrKey].itemSize;
      if (actualSize !== this.numVertices) {
        throw new Error(`Internal error calculating geometry attribute ${attrKey}: expected size ${this.numVertices} but got ${actualSize}`);
      }
    }
  };
}
