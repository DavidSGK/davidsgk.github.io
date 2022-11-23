import * as THREE from "three";
import pixelVertexShader from "../shaders/pixelVertex.glsl";
import pixelFragmentShader from "../shaders/pixelFragment.glsl";
import {
  HeartSpec,
  DKSpec,
  SmileSpec,
  MusicNoteSpec,
  SemicolonSpec,
  PixelShapeSpec,
} from "./pixel-specs";
import GeometryCalculator, { ShapeAttributes } from "./calculator";
import AttributeArrayManager from "./attribute-array-manager";

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
  } as const;

  // Non-pixel shapes, with no explicit shape specs
  static OtherShapes = {
    PLANET: OTHER_SHAPE_START,
  } as const;

  static ShapeSpecs = {
    [PixelObject.Shapes.DK]: DKSpec,
    [PixelObject.Shapes.SMILE]: SmileSpec,
    [PixelObject.Shapes.HEART]: HeartSpec,
    [PixelObject.Shapes.MUSIC_NOTE]: MusicNoteSpec,
    [PixelObject.Shapes.SEMICOLON]: SemicolonSpec,
  } as const;

  static CalculatorWorkerCodes = {
    ERROR: 0,
    INITIAL_ATTRIBUTES: 1,
    UPDATE_CURRENT: 2,
    UPDATE_TARGET: 3,
  } as const;

  private shapeSize: number;
  private transitionSpeed: number;
  private onInitComplete: () => void;
  private onTransitionComplete: () => void;

  private prngSeed: number;
  private numVertices: number;
  private geometry: THREE.BufferGeometry;
  private geometryCalculatorWorker: Worker;
  private attributeArrayManager: AttributeArrayManager;
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
    this.initCalculatorWorker();

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

    this.callCalculatorWorker({
      code: PixelObject.CalculatorWorkerCodes.INITIAL_ATTRIBUTES,
      shape: initialShape,
      shuffleUnits: true,
      pixelShapeArgs: {
        pixelShapeSpec: PixelObject.ShapeSpecs[initialShape],
        pixelSize: this.shapeSize,
      },
    });
    // this.pushGeometryAttributes(initialShape);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.add(this.mesh);

    this.onInitComplete = onInitComplete;
    this.onTransitionComplete = onTransitionComplete;
    this.inTransition = false;
  }

  getCurrentShape = () => this.material.uniforms.currentShape.value;

  setTargetShape = (shape: number): void => {
    // TODO: Handle interruptions
    if (this.inTransition) {
      return;
    }
    // Set target attributes
    this.prngSeed = Math.random();

    if (shape < OTHER_SHAPE_START) {
      this.callCalculatorWorker({
        code: PixelObject.CalculatorWorkerCodes.UPDATE_TARGET,
        shape,
        shuffleUnits: true,
        pixelShapeArgs: {
          pixelShapeSpec: PixelObject.ShapeSpecs[shape],
          pixelSize: this.shapeSize,
        },
      });
    } else if (shape === PixelObject.OtherShapes.PLANET) {
      this.callCalculatorWorker({
        code: PixelObject.CalculatorWorkerCodes.UPDATE_TARGET,
        shape,
        shuffleUnits: true,
        planetShapeArgs: {
          radius: this.shapeSize * 3,
          detail: 6,
          numRings: 3,
        },
      });
    }
  };

  /**
   * Should be called whenever the object needs to be updated
   * e.g. an animation tick
   */
  update = (): void => {
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

  dispose = (): void => {
    this.geometryCalculatorWorker.terminate();
    this.geometry.dispose();
    this.material.dispose();
  };

  private initCalculatorWorker = (): void => {
    this.geometryCalculatorWorker = new Worker(
      new URL("calculator-worker.ts", import.meta.url),
      { type: "module" },
    );

    // Allocate memory that will be moved back and forth with worker
    // To prevent spiky memory allocation/GC and copying
    this.attributeArrayManager = new AttributeArrayManager({
      numVertices: this.numVertices,
      attrNamesToItemSizes: GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES,
    });

    this.geometryCalculatorWorker.onmessage = (
      e: MessageEvent<{
        code: number;
        shape: number;
        attributes: ShapeAttributes;
        numUsedVertices: number;
        buffer: ArrayBuffer;
      }>,
    ) => {
      const { code, shape, attributes, numUsedVertices, buffer } = e.data;

      switch (code) {
        // Set current attributes and trigger initialize complete callback
        case PixelObject.CalculatorWorkerCodes.INITIAL_ATTRIBUTES:
          this.pushGeometryAttributes(
            shape,
            attributes,
            numUsedVertices,
            false,
          );
          this.onInitComplete();
          break;
        // Set target attributes and begin transition
        case PixelObject.CalculatorWorkerCodes.UPDATE_TARGET:
          this.pushGeometryAttributes(shape, attributes, numUsedVertices, true);
          this.material.uniforms.targetShape.value = shape;
          this.inTransition = true;
          break;
        case PixelObject.CalculatorWorkerCodes.ERROR:
          break;
        default:
          break;
      }

      // Transfer buffer back
      this.attributeArrayManager = new AttributeArrayManager({
        buffer,
        numVertices: this.numVertices,
        attrNamesToItemSizes: GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES,
      });
    };
  };

  private callCalculatorWorker = (calcArgs: {
    code: number;
    shape: number;
    shuffleUnits: boolean;
    pixelShapeArgs?: {
      pixelShapeSpec: PixelShapeSpec;
      pixelSize: number;
    };
    planetShapeArgs?: {
      radius: number;
      detail: number;
      numRings: number;
    };
  }): void => {
    this.geometryCalculatorWorker.postMessage(
      {
        ...calcArgs,
        numVertices: this.numVertices,
        rngSeed: this.prngSeed,
        buffer: this.attributeArrayManager.getBuffer(),
      },
      // Transfer underlying buffer to save on memory copy/GC
      [this.attributeArrayManager.getBuffer()],
    );
  };

  /**
   * Finish transition between shapes and update "current" attributes from previous target
   */
  private finishTransition = (): void => {
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
  private pushGeometryAttributes = (
    shape: number,
    attributes: ShapeAttributes,
    numUsedVertices: number,
    isTarget = false,
  ): void => {
    Object.entries(attributes).forEach(([name, data]) => {
      const attrKey = isTarget
        ? `target${name.charAt(0).toUpperCase()}${name.slice(1)}`
        : name;

      this.geometry.setAttribute(
        attrKey,
        new THREE.BufferAttribute(data.array, data.itemSize),
      );
    });

    // Also update used vertex count to allow adjusting transitions and handling leftover vertices
    if (!isTarget) {
      this.material.uniforms.currentShape.value = shape;
      this.material.uniforms.numUsedVertices.value = numUsedVertices;
    } else {
      this.material.uniforms.targetShape.value = shape;
      this.material.uniforms.numUsedVertices.value = Math.max(
        this.material.uniforms.numUsedVertices.value,
        numUsedVertices,
      );
    }
  };
}
