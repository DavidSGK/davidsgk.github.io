import * as THREE from "three";

/**
 * Allow using Three.js BufferGeometry to create 3D versions of pixellated text
 * Each "pixel" can be subdivided into cubes, which have 2 triangles per face
 */

// Number of squares that fit into length of pixel
const NUM_PIXEL_DIV = 4;
// Number of cubes (not pixels) a pixel is "deep"
const PIXEL_DEPTH = 4;

/**
 * Get a BufferGeometry object formed of subdivided cubes for a specified pixel shape.
 * @param {*} pixelWidth width of overall shape in number of pixels
 * @param {*} pixelHeight height of overall shape in number of pixels
 * @param {*} pixelCoords 2D array of 2D "pixel coordinates"
 * @param {*} pixelSize how long each side of a pixel should be
 */
function getPixelShapeGeometry(pixelWidth, pixelHeight, pixelCoords, pixelSize) {
  const cubeSize = pixelSize / NUM_PIXEL_DIV;
  // For convenience we start overall shape at "(0, 0, 0)" but offset for center
  const offsetX = pixelSize * (pixelWidth / 2) - (cubeSize / 2);
  const offsetY = pixelSize * (pixelHeight / 2) - (cubeSize / 2);
  const offsetZ = pixelSize * ((PIXEL_DEPTH / NUM_PIXEL_DIV) / 2) - (cubeSize / 2);

  let positions = [];

  pixelCoords.forEach(([pixelX, pixelY]) => {
    for (let localCubeX = 0; localCubeX < NUM_PIXEL_DIV; localCubeX++) {
      for (let localCubeY = 0; localCubeY < NUM_PIXEL_DIV; localCubeY++) {
        for (let cubeZ = 0; cubeZ < PIXEL_DEPTH; cubeZ++) {
          const cubeX = pixelX * NUM_PIXEL_DIV + localCubeX;
          const cubeY = pixelY * NUM_PIXEL_DIV + localCubeY;
          const cubeCenter = new THREE.Vector3(
            cubeX * cubeSize - offsetX,
            cubeY * cubeSize - offsetY,
            cubeZ * cubeSize - offsetZ,
          );

          positions.push(...getCubeVertices(cubeCenter, cubeSize));
        }
      }
    }
  });

  const indices = [...Array(36 * NUM_PIXEL_DIV * NUM_PIXEL_DIV * PIXEL_DEPTH * pixelCoords.length).keys()];

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(positions), 3));
  geometry.setIndex(indices);
  // Note that normal computation is based on counterclockwise specification of vertices for "out"
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Get vertices for cube of a specific size and center position.
 * Note there are 2 triangles per face and thus there are shared points.
 * Also note the order of faces is important.
 * Return value is a flat array.
 * @param {*} center
 * @param {*} size
 */
function getCubeVertices(center, size) {
  x = center.x;
  y = center.y;
  z = center.z;
  offset = size / 2;

  // Coords need to be specified counterclockwise for correct normals
  return [
    // Top
    x - offset, y + offset, z - offset,
    x - offset, y + offset, z + offset,
    x + offset, y + offset, z - offset,

    x + offset, y + offset, z - offset,
    x - offset, y + offset, z + offset,
    x + offset, y + offset, z + offset,
    // Bottom
    x - offset, y - offset, z + offset,
    x - offset, y - offset, z - offset,
    x + offset, y - offset, z - offset,

    x + offset, y - offset, z - offset,
    x + offset, y - offset, z + offset,
    x - offset, y - offset, z + offset,
    // Left
    x - offset, y + offset, z - offset,
    x - offset, y - offset, z - offset,
    x - offset, y + offset, z + offset,

    x - offset, y + offset, z + offset,
    x - offset, y - offset, z - offset,
    x - offset, y - offset, z + offset,
    // Right
    x + offset, y - offset, z - offset,
    x + offset, y + offset, z - offset,
    x + offset, y + offset, z + offset,

    x + offset, y + offset, z + offset,
    x + offset, y - offset, z + offset,
    x + offset, y - offset, z - offset,
    // Front
    x - offset, y + offset, z + offset,
    x - offset, y - offset, z + offset,
    x + offset, y + offset, z + offset,

    x + offset, y + offset, z + offset,
    x - offset, y - offset, z + offset,
    x + offset, y - offset, z + offset,
    // Back
    x - offset, y - offset, z - offset,
    x - offset, y + offset, z - offset,
    x + offset, y + offset, z - offset,

    x + offset, y + offset, z - offset,
    x + offset, y - offset, z - offset,
    x - offset, y - offset, z - offset,
  ];
}

export { getPixelShapeGeometry };