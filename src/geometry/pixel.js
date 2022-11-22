import * as THREE from "three";
import Alea from "alea";
import { createNoise3D } from "simplex-noise";
import pixelVertexShader from "../shaders/pixelVertex.glsl";
import pixelFragmentShader from "../shaders/pixelFragment.glsl";
import {
  HeartSpec,
  DKSpec,
  SmileSpec,
  MusicNoteSpec,
  SemicolonSpec,
} from "./pixel-specs";
import GeometryCalculator from "./calculator.ts";

/**
 * Allow using Three.js BufferGeometry to create 3D versions of pixellated shapes
 * Each "pixel" can be subdivided into cubes, which have 2 triangles per face
 */

const OTHER_SHAPE_START = 10;
const NOISE_FREQUENCY_MULTIPLIER = 0.2;
// In TS maybe this could be done in a cleaner way, by explicitly setting struct type for all attributes
const BUFFER_ATTRIBUTES = [
  "position",
  "index",
  "normal",
  "cubeCenterOffset",
  "noise",
  "unitRandom",
  "unitIndex",
];

/**
 * Extension of Object3D to more easily manage a pixel shape geometry/material
 * for things like specific animations.
 *
 * Is set up to allow transitiong to some "idle" shapes and "target" shapes.
 * These shapes may or may not be pixel shapes.
 * Animations are handled by the vertex shader for the material.
 */
export default class PixelObject extends THREE.Object3D {
  static Shapes = {
    DK: 0,
    SMILE: 1,
    HEART: 2,
    MUSIC_NOTE: 3,
    SEMICOLON: 4,
  };

  // Non-pixel shapes, with no explicit shape specs
  static OtherShapes = {
    PLANET: OTHER_SHAPE_START,
  };

  static ShapeSpecs = {
    [PixelObject.Shapes.DK]: DKSpec,
    [PixelObject.Shapes.SMILE]: SmileSpec,
    [PixelObject.Shapes.HEART]: HeartSpec,
    [PixelObject.Shapes.MUSIC_NOTE]: MusicNoteSpec,
    [PixelObject.Shapes.SEMICOLON]: SemicolonSpec,
  };

  constructor(
    initialShape,
    size,
    transitionSpeed = 1,
    onFinishTransition = () => {},
  ) {
    super();

    this.transitionSpeed = transitionSpeed;
    this.noise3DGenerator = createNoise3D();
    // Seed for any generation that requires deterministic behavior
    // e.g. when target -> current need to look the same
    this.prngSeed = Math.random();

    // Match number of vertices to max required
    // NOTE: Currently doesn't consider non-pixel shapes
    this.numVertices = Math.max(
      ...Object.values(PixelObject.ShapeSpecs).map(
        (spec) =>
          36 *
          spec.coords.length *
          spec.resolution *
          spec.resolution *
          spec.depth,
      ),
    );

    this.shapeSize = size;
    this.geometry = new THREE.BufferGeometry();
    this.geometryCalculator = new GeometryCalculator(
      this.numVertices,
      this.noise3D,
      new Alea(this.prngSeed),
    );

    this.material = new THREE.RawShaderMaterial({
      vertexShader: pixelVertexShader,
      fragmentShader: pixelFragmentShader,
      transparent: true,
      // Disable interacting with lights - if we want, we need to add more uniforms
      lights: true,
      uniforms: THREE.UniformsUtils.merge([
        {
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
        },
        THREE.UniformsLib.lights,
      ]),
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
    this.geometryCalculator.rng = new Alea(this.prngSeed);
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
      this.material.uniforms.transProgress.value = Math.min(
        this.material.uniforms.transProgress.value + delta,
        1,
      );
    } else if (this.inTransition) {
      // Want this to only fire once
      this.finishTransition();
    }
  }

  /**
   * Finish transition between shapes and update "current" attributes from previous target
   */
  finishTransition() {
    this.material.uniforms.currentShape.value =
      this.material.uniforms.targetShape.value;
    this.material.uniforms.transEndTime.value =
      this.material.uniforms.time.value;
    this.material.uniforms.transProgress.value = 0;

    // Copying attributes
    BUFFER_ATTRIBUTES.forEach((attrKey) => {
      const targetAttrKey = `target${attrKey
        .charAt(0)
        .toUpperCase()}${attrKey.slice(1)}`;
      this.geometry
        .getAttribute(attrKey)
        .set(this.geometry.getAttribute(targetAttrKey).array);
      this.geometry.getAttribute(attrKey).needsUpdate = true;
    });

    this.inTransition = false;
    this.onFinishTransition();
  }

  setGeometryAttributes(shape, isTarget = false) {
    let geometryAttributes;
    let numUsedVertices;
    if (shape < OTHER_SHAPE_START) {
      ({ attributes: geometryAttributes, numUsedVertices } =
        this.geometryCalculator.getPixelGeometryAttributes(
          PixelObject.ShapeSpecs[shape],
          this.shapeSize,
          true,
        ));
    } else if (shape === PixelObject.OtherShapes.PLANET) {
      ({ attributes: geometryAttributes, numUsedVertices } =
        this.geometryCalculator.getPlanetGeometryAttributes(
          this.shapeSize * 3,
          6,
          true,
        ));
    } else {
      throw new Error("Invalid shape specified.");
    }

    Object.keys(geometryAttributes).forEach((attr) => {
      const attrKey = isTarget
        ? `target${attr.charAt(0).toUpperCase()}${attr.slice(1)}`
        : attr;
      if (this.geometry.hasAttribute(attrKey)) {
        this.geometry.getAttribute(attrKey).set(geometryAttributes[attr].array);
        this.geometry.getAttribute(attrKey).needsUpdate = true;
      } else {
        this.geometry.setAttribute(
          attrKey,
          new THREE.BufferAttribute(
            geometryAttributes[attr].array,
            geometryAttributes[attr].itemSize,
          ),
        );
      }
    });
    // Also update used vertex count to allow adjusting transitions and handling leftover vertices
    if (!isTarget) {
      this.material.uniforms.numUsedVertices.value = numUsedVertices;
    } else {
      this.material.uniforms.numUsedVertices.value = Math.max(
        this.material.uniforms.numUsedVertices.value,
        numUsedVertices,
      );
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }

  noise3D = (x, y, z) =>
    this.noise3DGenerator(
      x * NOISE_FREQUENCY_MULTIPLIER,
      y * NOISE_FREQUENCY_MULTIPLIER,
      z * NOISE_FREQUENCY_MULTIPLIER,
    );
}
