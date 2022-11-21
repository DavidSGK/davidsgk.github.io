import { MathUtils } from "three";

const swap = (a, i, j) => {
  const temp = a[i];
  a[i] = a[j];
  a[j] = temp;
};

/**
 * Shuffle using Fisher-Yates algorithm https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
 * 
 * Can specify size of contiguous "batches" to shuffle instead of all elements
 * @param {any[]} a
 * @param {int} batchSize
 */
export const shuffle = (a, batchSize = 1) => {
  if (a.length % batchSize !== 0) {
    throw new Error("Array length must be divisible by batch size.");
  }
  for (let i = 0; i < a.length / batchSize - 1; i++) {
    const toSwap = MathUtils.randInt(i, a.length / batchSize - 1);
    for (let j = 0; j < batchSize; j++) {
      swap(a, i * batchSize + j, toSwap * batchSize + j);
    }
  }
};