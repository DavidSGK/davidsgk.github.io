import * as THREE from "three";
import pixelVertexShader from "../shaders/pixelVertex.glsl";
import pixelFragmentShader from "../shaders/pixelFragment.glsl";
import {
  HeartSpec,
  DKSpec,
  SmileSpec,
  MusicNoteSpec,
  SemicolonSpec,
} from "./pixel-specs";
import GeometryCalculator from "./calculator";

/**
 * Allow using Three.js BufferGeometry to create 3D versions of pixellated shapes
 * Each "pixel" can be subdivided into cubes, which have 2 triangles per face
 */

const OTHER_SHAPE_START = 10;

/**
 * Extension of Object3D to more easily manage a pixel shape geometry/material
 * for things like specific animations.
 *
 * Is set up to allow transitioningg to some "idle" shapes and "target" shapes.
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

  private shapeSize: number;
  private transitionSpeed: number;
  private onInitComplete: () => void;
  private onTransitionComplete: () => void;

  private prngSeed: number;
  private numVertices: number;
  private geometry: THREE.BufferGeometry;
  private geometryCalculator: GeometryCalculator;
  private material: THREE.RawShaderMaterial;
  private mesh: THREE.Mesh<any, any>;
  private inTransition: boolean;

  constructor(
    initialShape: number,
    size: number,
    transitionSpeed = 1,
    onInitComplete = () => {},
    onTransitionComplete = () => {},
  ) {
    super();

    this.transitionSpeed = transitionSpeed;

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

    this.prngSeed = Math.random();
    this.shapeSize = size;
    this.geometry = new THREE.BufferGeometry();
    this.geometryCalculator = new GeometryCalculator(
      this.numVertices,
      this.prngSeed,
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

    this.pushGeometryAttributes(initialShape);
    this.pushGeometryAttributes(initialShape, true);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);

    this.onInitComplete = onInitComplete;
    this.onTransitionComplete = onTransitionComplete;
    this.inTransition = false;
  }

  getCurrentShape = () => this.material.uniforms.currentShape.value;

  setTargetShape = (shape: number) => {
    // TODO: Handle interruptions
    if (this.inTransition) {
      return;
    }
    // Set target attributes
    this.prngSeed = Math.random();
    this.geometryCalculator.setSeed(this.prngSeed);
    this.pushGeometryAttributes(shape, true);

    // Update both current and target
    this.material.uniforms.targetShape.value = shape;
    this.inTransition = true;
  };

  /**
   * Should be called whenever the object needs to be updated
   * e.g. an animation tick
   */
  update = () => {
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
  };

  dispose = () => {
    this.geometry.dispose();
    this.material.dispose();
  };

  /**
   * Finish transition between shapes and update "current" attributes from previous target
   */
  private finishTransition = () => {
    this.material.uniforms.currentShape.value =
      this.material.uniforms.targetShape.value;
    this.material.uniforms.transEndTime.value =
      this.material.uniforms.time.value;
    this.material.uniforms.transProgress.value = 0;

    // Copying attributes
    GeometryCalculator.ATTRIBUTES.forEach((attrKey) => {
      const targetAttrKey = `target${attrKey
        .charAt(0)
        .toUpperCase()}${attrKey.slice(1)}`;
      this.geometry.setAttribute(
        attrKey,
        new THREE.BufferAttribute(
          this.geometry.getAttribute(targetAttrKey).array,
          this.geometry.getAttribute(targetAttrKey).itemSize,
        ),
      );
    });

    this.inTransition = false;
    this.onTransitionComplete();
  };

  /**
   * Push given attributes to the material appropriately for use in the shader.
   */
  private pushGeometryAttributes = (shape: number, isTarget = false) => {
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
          3,
          true,
        ));
    } else {
      throw new Error("Invalid shape specified.");
    }

    Object.keys(geometryAttributes).forEach((attr) => {
      const attrKey = isTarget
        ? `target${attr.charAt(0).toUpperCase()}${attr.slice(1)}`
        : attr;

      this.geometry.setAttribute(
        attrKey,
        new THREE.BufferAttribute(
          geometryAttributes[attr].array,
          geometryAttributes[attr].itemSize,
        ),
      );
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
  };
}
