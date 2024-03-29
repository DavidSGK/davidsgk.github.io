const STANDARD_RES = 3;

export interface PixelShapeSpec {
  width: number;
  height: number;
  depth: number;
  resolution: number;
  scale: number;
  coords: [number, number][];
}

export const DKSpec: PixelShapeSpec = {
  width: 9,
  height: 7,
  depth: STANDARD_RES,
  resolution: STANDARD_RES,
  scale: 1.0,
  coords: [
    [0, 0],
    [1, 0],
    [2, 0],
    [5, 0],
    [8, 0],
    [0, 1],
    [3, 1],
    [5, 1],
    [8, 1],
    [0, 2],
    [3, 2],
    [5, 2],
    [7, 2],
    [0, 3],
    [3, 3],
    [5, 3],
    [6, 3],
    [0, 4],
    [3, 4],
    [5, 4],
    [7, 4],
    [0, 5],
    [3, 5],
    [5, 5],
    [8, 5],
    [0, 6],
    [1, 6],
    [2, 6],
    [5, 6],
    [8, 6],
  ],
};

export const SmileSpec: PixelShapeSpec = {
  width: 7,
  height: 7,
  depth: STANDARD_RES + 1,
  resolution: STANDARD_RES + 1,
  scale: 1.0,
  coords: [
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
    [5, 0],
    [0, 1],
    [6, 1],
    [1, 4],
    [5, 4],
    [1, 5],
    [5, 5],
    [1, 6],
    [5, 6],
  ],
};

export const HeartSpec: PixelShapeSpec = {
  width: 7,
  height: 6,
  depth: STANDARD_RES,
  resolution: STANDARD_RES,
  scale: 1.1,
  coords: [
    [3, 0],
    [2, 1],
    [3, 1],
    [4, 1],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
    [5, 3],
    [6, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
    [5, 4],
    [6, 4],
    [1, 5],
    [2, 5],
    [4, 5],
    [5, 5],
  ],
};

export const MusicNoteSpec: PixelShapeSpec = {
  width: 10,
  height: 13,
  depth: STANDARD_RES,
  resolution: STANDARD_RES,
  scale: 0.75,
  coords: [
    [7, 0],
    [8, 0],
    [6, 1],
    [7, 1],
    [8, 1],
    [9, 1],
    [1, 2],
    [2, 2],
    [6, 2],
    [7, 2],
    [8, 2],
    [9, 2],
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [7, 3],
    [8, 3],
    [9, 3],
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [9, 4],
    [1, 5],
    [2, 5],
    [3, 5],
    [9, 5],
    [3, 6],
    [9, 6],
    [3, 7],
    [9, 7],
    [3, 8],
    [9, 8],
    [3, 9],
    [8, 9],
    [9, 9],
    [3, 10],
    [6, 10],
    [7, 10],
    [8, 10],
    [9, 10],
    [3, 11],
    [4, 11],
    [5, 11],
    [6, 11],
    [7, 11],
    [3, 12],
    [4, 12],
    [5, 12],
  ],
};

export const ExclamationSpec: PixelShapeSpec = {
  width: 1,
  height: 7,
  depth: STANDARD_RES * 2,
  resolution: STANDARD_RES * 2,
  scale: 1.1,
  coords: [
    [0, 0],
    [0, 2],
    [0, 3],
    [0, 4],
    [0, 5],
    [0, 6],
  ],
};

export const SemicolonSpec: PixelShapeSpec = {
  width: 2,
  height: 8,
  depth: STANDARD_RES + 1,
  resolution: STANDARD_RES + 1,
  scale: 0.8,
  coords: [
    [0, 0],
    [1, 1],
    [0, 2],
    [1, 2],
    [0, 3],
    [1, 3],
    [0, 6],
    [1, 6],
    [0, 7],
    [1, 7],
  ],
};
