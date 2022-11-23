/* eslint-disable no-param-reassign */
import { MathUtils, Vector3 } from "three";

const swap = (a: any[] | ArrayBufferView, i: number, j: number) => {
  const temp = a[i];
  a[i] = a[j];
  a[j] = temp;
};

/**
 * Shuffle using Fisher-Yates algorithm https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 *
 * Can specify size of contiguous "batches" to shuffle instead of all elements
 */
export const shuffle = (a: any[] | TypedArray, batchSize = 1): typeof a => {
  if (a.length % batchSize !== 0) {
    throw new Error("Array length must be divisible by batch size.");
  }
  for (let i = 0; i < a.length / batchSize - 1; i += 1) {
    const toSwap = MathUtils.randInt(i, a.length / batchSize - 1);
    for (let j = 0; j < batchSize; j += 1) {
      swap(a, i * batchSize + j, toSwap * batchSize + j);
    }
  }
  return a;
};

/**
 * Return a "balanced" array by shifting batches of elements from the back to the front
 */
export const balanceBatches = (
  a: any[],
  start: number,
  batchSize: number,
): typeof a => {
  let mid = Math.floor((a.length - start) / 2);
  mid -= mid % batchSize;
  const balanced: typeof a = [];
  a.slice(start + mid).forEach((x) => {
    balanced.push(x);
  });
  a.slice(0, start).forEach((x) => {
    balanced.push(x);
  });
  a.slice(start, start + mid).forEach((x) => {
    balanced.push(x);
  });

  return balanced;
};

/**
 * Calculate the normal of a triangle formed by va, vb, vc
 * assuming they are provided in counterclockwise order (for an outwards normal)
 */
export const calculateNormal = (
  va: Vector3,
  vb: Vector3,
  vc: Vector3,
): Vector3 => {
  const vcb = new Vector3().subVectors(vc, vb);
  const vab = new Vector3().subVectors(va, vb);
  vcb.cross(vab);
  vcb.normalize();

  return vcb;
};
