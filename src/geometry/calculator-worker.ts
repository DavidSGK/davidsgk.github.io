// NOTE: There were issues when trying to work with a TypeScript file for a worker with Parcel
import AttributeArrayManager from "./attribute-array-manager";
import GeometryCalculator, { ShapeAttributes } from "./calculator";
import { PixelShapeSpec } from "./pixel-specs";

function getAttributes(
  calculator: GeometryCalculator,
  shuffleUnits: boolean,
  { pixelShapeArgs, planetShapeArgs },
): { attributes: ShapeAttributes; numUsedVertices: number } {
  if (pixelShapeArgs) {
    const { pixelShapeSpec, pixelSize } = pixelShapeArgs;
    return calculator.getPixelGeometryAttributes(
      pixelShapeSpec,
      pixelSize,
      shuffleUnits,
    );
  }
  if (planetShapeArgs) {
    const { radius, detail, numRings } = planetShapeArgs;
    return calculator.getPlanetGeometryAttributes(
      radius,
      detail,
      numRings,
      shuffleUnits,
    );
  }

  throw new Error("No valid shape args specified.");
}

onmessage = function onMessageHandler(
  e: MessageEvent<{
    code: number;
    shape: number;
    numVertices: number;
    rngSeed: number;
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
    buffer: ArrayBuffer;
  }>,
) {
  const {
    code,
    shape,
    numVertices,
    rngSeed,
    shuffleUnits,
    pixelShapeArgs,
    planetShapeArgs,
    buffer,
  } = e.data;

  const attributeArrayManager = new AttributeArrayManager({
    buffer,
    numVertices,
    attrNamesToItemSizes: GeometryCalculator.ATTRIBUTES_TO_ITEM_SIZES,
  });

  const calculator = new GeometryCalculator(
    numVertices,
    rngSeed,
    attributeArrayManager,
  );

  try {
    const { attributes, numUsedVertices } = getAttributes(
      calculator,
      shuffleUnits,
      { pixelShapeArgs, planetShapeArgs },
    );

    postMessage(
      {
        code,
        shape,
        attributes,
        numUsedVertices,
        buffer: attributeArrayManager.getBuffer(),
      },
      // Transfer buffer back
      [attributeArrayManager.getBuffer()],
    );
  } catch {
    postMessage(
      { code: 0, buffer: attributeArrayManager.getBuffer() },
      // Transfer buffer back
      [attributeArrayManager.getBuffer()],
    );
  }
};
