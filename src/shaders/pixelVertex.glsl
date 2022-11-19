#include <common>

// Declare uniforms/attributes so we can use with RawShaderMaterial
// Don't need all builtins because relatively simple
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float time;
uniform int currentShape;
uniform int targetShape;
uniform float transProgress;

#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
  // NOTE: To handle light intensity, we would have to add separate uniform
  vec3 direction;
  vec3 color;
};
uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif

attribute vec3 position;
attribute float index;
attribute vec3 normal;
attribute vec3 cubeCenterOffset;
attribute float noise;
attribute vec3 cubeRandom;

attribute vec3 targetPosition;
attribute vec3 targetNormal;
attribute vec3 targetCubeCenterOffset;
attribute float targetNoise;
attribute vec3 targetCubeRandom;

varying vec4 vertColor;

// We want to work in HSV because we want colors to be above certain brightness
// Taken from https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Angle between 2 vectors
float angle(vec2 from, vec2 to, bool clockwise) {
  // Handle undefined atan case
  if (length(from) == 0.0 || length(to) == 0.0) {
    return 0.0;
  }
  float dp = dot(from, to);
  float det = from.x * to.y - from.y * to.x;
  if (clockwise) {
    return atan(dot(from, to), det);
  } else {
    return atan(det, dot(from, to));
  }
}

vec3 rotateAround(vec3 v, float angle, vec3 axis) {
  vec3 a = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float cc = 1.0 - c;

  mat3 rotMat = mat3(
    cc * a.x * a.x + c,       cc * a.x * a.y - a.z * s, cc * a.z * a.x + a.y * s,
    cc * a.x * a.y + a.z * s, cc * a.y * a.y + c,       cc * a.y * a.z - a.x * s,
    cc * a.z * a.x - a.y * s, cc * a.y * a.z + a.x * s, cc * a.z * a.z + c
  );

  return rotMat * v;
}

float orbitRadius(float curAngle, float startAngle, float endAngle, float startRadius, float endRadius, float scale) {
  if (startAngle == endAngle) {
    return startRadius;
  }
  float radiusScale = (endRadius - startRadius) / (endAngle - startAngle) * (curAngle - startAngle) + startRadius;
  float orbitRadius = scale * sin(PI / (endAngle - startAngle) * (curAngle - startAngle)) + 1.0;

  return radiusScale * orbitRadius;
}

void main() {
  // TODO: Implement staggered progress by adding cube index attribute

  vec3 newPos = position;
  // Need to also update normal based on any transformations to vertices
  vec3 newNorm = normal;
  float newNoise = noise;

  vec3 cCubeCenterOffset = cubeCenterOffset;
  vec3 tPos = targetPosition;
  vec3 tCubeCenterOffset = targetCubeCenterOffset;

  // Interpolate noise
  newNoise = mix(newNoise, targetNoise, min(transProgress * 2.0, 1.0));

  // At transProgress = 0, we want to be at current
  // At transProgress = 1, we want to be at target
  // We could apply "physics" to vertices to move them along a path naturally to the target over time
  // We choose to use polar equations for paths because it's easier (but probably more expensive)
  // Polar equations should also play more nicely with easing effects on the overall transition
  // Need to set up polar equation such that at the target angle, we are at the correct radius

  // Orbit based on cube center
  newPos -= cCubeCenterOffset;
  tPos -= tCubeCenterOffset;

  // Y axis rotation (i.e. flat on XZ plane)
  float cLenXZ = length(newPos.xz);
  vec2 cDirXZ = cLenXZ == 0.0 ? vec2(1.0, 0.0) : normalize(newPos.xz);
  vec2 tDirXZ = tPos.xz == vec2(0.0, 0.0) ? vec2(1.0, 0.0) : normalize(tPos.xz);
  float cRotY = angle(vec2(1.0, 0.0), cDirXZ, false);
  float rotY = angle(cDirXZ, tDirXZ, false);
  rotY += 2.0 * PI;
  if (rotY == 0.0) {
    rotY = 2.0 * PI;
  }
  float dRotY = mix(0.0, rotY, transProgress);
  // Scale orbit randomly and influenced by how originally close the cube was
  float orbitYScale = (cubeRandom.y + targetCubeRandom.y - 1.0) * (10.0 / (cLenXZ + 0.1));
  float radXZ = orbitRadius(cRotY + dRotY, cRotY, cRotY + rotY, cLenXZ, length(tPos.xz), orbitYScale);

  newPos.x = cos(cRotY + dRotY) * radXZ;
  newPos.z = sin(cRotY + dRotY) * radXZ;

  // Simple interpolation for Y for now
  newPos.y = mix(newPos.y, tPos.y, transProgress) * ((cubeRandom.x + targetCubeRandom.x) * 2.5 * sin(transProgress * PI) + 1.0);

  newPos += mix(cCubeCenterOffset, tCubeCenterOffset, transProgress);
  newNorm = mix(normal, targetNormal, transProgress);

  // Update position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);

  // Update vertex color (to be used by fragment shader)
  // Lots of magic numbers here for an aesthetic cycle of colors
  float h = sin(time * 0.1 + newNoise * 0.25) * 0.5 + 0.5;
  float s = sin(time * 0.3 + newNoise * 0.4) * newNoise * 0.05 + 0.65;
  vertColor = vec4(hsv2rgb(vec3(h, s, 1.0)), 1.0);

  // Calculate directional lighting
  #if NUM_DIR_LIGHTS > 0
  vec3 diffuseColor = vec3(0.0, 0.0, 0.0);
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    // Clamp because we don't actually want full dark for non-facing
    float diffuseStrength = clamp(dot(newNorm, directionalLights[i].direction), 0.3, 1.0);
    diffuseColor += diffuseStrength * directionalLights[i].color;
  }
  vertColor *= vec4(diffuseColor, 1.0);
  #endif
}